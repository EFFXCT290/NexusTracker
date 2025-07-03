import express from "express";
import {
  setTorrentProtection,
  verifyTorrentPassword,
  logProtectedDownload,
  getProtectedLogs,
  getProtectedTorrents,
} from "../controllers/protectTorrent";
import auth from "../middleware/auth";

// ADD PROTECT TORRENT FEATURE

const router = express.Router();

// All routes require authentication
router.use(auth);

// Set torrent protection (admin only)
router.post("/set/:infoHash", setTorrentProtection);

// Verify password for protected torrent
router.post("/verify/:infoHash", verifyTorrentPassword);

// Log protected torrent download
router.post("/log/:infoHash", logProtectedDownload);

// Get protected torrent logs (admin only)
router.get("/logs/:infoHash", getProtectedLogs);

// Get all protected torrents (admin only)
router.get("/list", getProtectedTorrents);

export default router;

// End of Protect Torrent Feature 