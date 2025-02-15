import parseHttpRequest from "bittorrent-tracker/lib/server/parse-http";
import bencode from "bencode";
import handleAnnounce from "./announce";
import Progress from '../schema/progress';
import User from '../schema/user';

const createTrackerRoute = (action, onRequest) => async (req, res) => {
  if (action === "announce") {
    await handleAnnounce(req, res);
    if (res.writableEnded) return;
  }

  // bittorrent-tracker will only parse a single IP in x-forwarded-for, and will
  // fail if it includes a comma-separated list
  if (req.headers["x-forwarded-for"]) {
    req.headers["x-forwarded-for"] =
      req.headers["x-forwarded-for"].split(",")[0];
  }

  let params;
  try {
    params = parseHttpRequest(req, { action, trustProxy: true });
    params.httpReq = req;
    params.httpRes = res;

    const now = new Date();
    
    // Find all progress records for this user/torrent combination
    const allUserProgress = await Progress.find({
      userId: params.user._id,
      infoHash: params.infoHash,
    }).lean();

    // Calculate total progress across all peers
    const totalUploaded = allUserProgress.reduce((sum, record) => 
      sum + (record.uploaded?.total || 0), 0);
    const totalDownloaded = allUserProgress.reduce((sum, record) => 
      sum + (record.downloaded?.total || 0), 0);

    // Update current peer's progress
    await Progress.findOneAndUpdate(
      { userId: params.user._id, peerId: params.peerId, infoHash: params.infoHash },
      {
        $set: {
          userId: params.user._id,
          infoHash: params.infoHash,
          uploaded: {
            session: params.uploaded,
            total: (params.prevProgressRecord?.uploaded?.total ?? 0) + params.uploadDeltaSession,
          },
          downloaded: {
            session: params.downloaded,
            total: (params.prevProgressRecord?.downloaded?.total ?? 0) + params.downloadDeltaSession,
          },
          left: Number(params.left),
          lastSeen: now,
        },
      },
      { upsert: true }
    );

    // Only clean up truly inactive peers
    await Progress.deleteMany({
      userId: params.user._id,
      infoHash: params.infoHash,
      lastSeen: { $lt: new Date(now - 24 * 60 * 60 * 1000) }, // 24 hours
      peerId: { $ne: params.peerId }, // Don't delete current peer
      'uploaded.session': 0,    // Only delete peers with no active upload
      'downloaded.session': 0   // Only delete peers with no active download
    });

    // Update user's total stats if needed
    await User.findByIdAndUpdate(params.user._id, {
      $set: {
        uploaded: totalUploaded,
        downloaded: totalDownloaded
      }
    });
  } catch (err) {
    res.end(
      bencode.encode({
        "failure reason": err.message,
      })
    );
  }
  onRequest(params, (err, response) => {
    let finalResponse = response;
    delete finalResponse.action;
    if (err) {
      finalResponse = {
        "failure reason": err.message,
      };
    } else {
      if (action === "announce") {
        finalResponse["interval"] = 30;
        finalResponse["min interval"] = 30;
      }
    }
    res.end(bencode.encode(finalResponse));
  });
};

export default createTrackerRoute;
