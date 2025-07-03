import mongoose from "mongoose";

const ProtectedDownloadSchema = new mongoose.Schema({
  torrentInfoHash: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username: String,
  email: String,
  torrentName: String,
  downloadedAt: { type: Date, default: Date.now },
});

export default mongoose.model("ProtectedDownload", ProtectedDownloadSchema); 