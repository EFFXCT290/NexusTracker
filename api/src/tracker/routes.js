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

    const userId = req.originalUrl.split("/")[2];
    const user = await User.findOne({ uid: userId }).lean();
    
    if (!user) {
      throw new Error("User not found");
    }

    params.user = user;
    const now = new Date();
    
    // Find previous progress record
    const prevProgressRecord = await Progress.findOne({
      userId: user._id,
      peerId: params.peerId,
      infoHash: params.infoHash,
    }).lean();

    // Calculate deltas safely
    const uploaded = Number(params.uploaded) || 0;
    const downloaded = Number(params.downloaded) || 0;
    const uploadDeltaSession = Math.max(0, uploaded - (prevProgressRecord?.uploaded?.session || 0));
    const downloadDeltaSession = Math.max(0, downloaded - (prevProgressRecord?.downloaded?.session || 0));

    // Update current peer's progress
    await Progress.findOneAndUpdate(
      { userId: user._id, peerId: params.peerId, infoHash: params.infoHash },
      {
        $set: {
          userId: user._id,
          infoHash: params.infoHash,
          peerId: params.peerId,
          uploaded: {
            session: uploaded,
            total: (prevProgressRecord?.uploaded?.total || 0) + uploadDeltaSession,
          },
          downloaded: {
            session: downloaded,
            total: (prevProgressRecord?.downloaded?.total || 0) + downloadDeltaSession,
          },
          left: Number(params.left) || 0,
          lastSeen: now,
        },
      },
      { upsert: true }
    );

    // Calculate totals from all peers
    const [totals] = await Progress.aggregate([
      {
        $match: {
          userId: user._id,
          infoHash: params.infoHash,
        },
      },
      {
        $group: {
          _id: null,
          uploaded: { $sum: "$uploaded.total" },
          downloaded: { $sum: "$downloaded.total" },
        },
      },
    ]);

    // Update user's total stats
    if (totals) {
      await User.findByIdAndUpdate(user._id, {
        $set: {
          uploaded: totals.uploaded || 0,
          downloaded: totals.downloaded || 0,
        }
      });
    }

    // Clean up inactive peers
    await Progress.deleteMany({
      userId: user._id,
      infoHash: params.infoHash,
      lastSeen: { $lt: new Date(now - 24 * 60 * 60 * 1000) },
      peerId: { $ne: params.peerId },
      'uploaded.session': 0,
      'downloaded.session': 0
    });

  } catch (err) {
    res.end(
      bencode.encode({
        "failure reason": err.message,
      })
    );
    return;
  }

  onRequest(params, (err, response) => {
    let finalResponse = response;
    if (err) {
      finalResponse = {
        "failure reason": err.message,
      };
    } else {
      if (action === "announce") {
        finalResponse = {
          ...finalResponse,
          "interval": 30,
          "min interval": 30,
        };
      }
    }
    res.end(bencode.encode(finalResponse));
  });
};

export default createTrackerRoute;
