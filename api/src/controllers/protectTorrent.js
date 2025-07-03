import crypto from "crypto";
import Torrent from "../schema/torrent";
import User from "../schema/user";
import ProtectedDownload from "../schema/protectedDownload";

// ADD PROTECT TORRENT FEATURE

/**
 * Hash password using the same method as user passwords
 */
const hashPassword = (password) => {
  return crypto.createHash("sha256").update(password + process.env.SQ_JWT_SECRET).digest("hex");
};

/**
 * Set torrent protection with password
 */
export const setTorrentProtection = async (req, res, next) => {
  try {
    const { infoHash } = req.params;
    const { password, isProtected } = req.body;

    // Only admins can set protection
    if (req.userRole !== "admin") {
      return res.status(403).send("Only admins can set torrent protection");
    }

    const torrent = await Torrent.findOne({ infoHash });
    if (!torrent) {
      return res.status(404).send("Torrent not found");
    }

    // Update protection status
    torrent.isProtected = isProtected;
    
    if (isProtected && password) {
      torrent.protectedPassword = hashPassword(password);
    } else if (!isProtected) {
      torrent.protectedPassword = null;
    }

    await torrent.save();

    res.status(200).json({ 
      success: true, 
      message: isProtected ? "Torrent protected successfully" : "Torrent protection removed" 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify password for protected torrent
 */
export const verifyTorrentPassword = async (req, res, next) => {
  try {
    const { infoHash } = req.params;
    const { password } = req.body;

    const torrent = await Torrent.findOne({ infoHash });
    if (!torrent) {
      return res.status(404).send("Torrent not found");
    }

    if (!torrent.isProtected) {
      return res.status(400).send("Torrent is not protected");
    }

    const hashedPassword = hashPassword(password);
    const isValid = torrent.protectedPassword === hashedPassword;

    res.status(200).json({ isValid });
  } catch (error) {
    next(error);
  }
};

/**
 * Log protected torrent download
 */
export const logProtectedDownload = async (req, res, next) => {
  try {
    const { infoHash } = req.params;

    const torrent = await Torrent.findOne({ infoHash });
    if (!torrent) {
      return res.status(404).send("Torrent not found");
    }

    if (!torrent.isProtected) {
      return res.status(400).send("Torrent is not protected");
    }

    const user = await User.findOne({ _id: req.userId });
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Add log entry to the new collection
    await ProtectedDownload.create({
      torrentInfoHash: infoHash,
      userId: user._id,
      username: user.username,
      email: user.email,
      torrentName: torrent.name,
      downloadedAt: new Date(),
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * Get protected torrent logs (admin only)
 */
export const getProtectedLogs = async (req, res, next) => {
  try {
    const { infoHash } = req.params;

    // Only admins can view logs
    if (req.userRole !== "admin") {
      return res.status(403).send("Only admins can view protected torrent logs");
    }

    // Fetch logs from the new collection
    const logs = await ProtectedDownload.find({ torrentInfoHash: infoHash }).sort({ downloadedAt: 1 });
    res.status(200).json({ logs });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all protected torrents (admin only)
 */
export const getProtectedTorrents = async (req, res, next) => {
  try {
    // Only admins can view protected torrents
    if (req.userRole !== "admin") {
      return res.status(403).send("Only admins can view protected torrents");
    }

    const protectedTorrents = await Torrent.find(
      { isProtected: true },
      { 
        infoHash: 1, 
        name: 1, 
        created: 1, 
        downloads: 1,
        protectedLogs: 1 
      }
    ).sort({ created: -1 });

    res.status(200).json({ torrents: protectedTorrents });
  } catch (error) {
    next(error);
  }
};

// End of Protect Torrent Feature 