import mongoose from "mongoose";
import fuzzySearch from "mongoose-fuzzy-searching";

const Torrent = new mongoose.Schema({
  infoHash: String,
  binary: String,
  poster: String,
  uploadedBy: { type: mongoose.Schema.ObjectId, ref: 'user' },
  name: String,
  description: String,
  type: String,
  source: String,
  image: String,
  downloads: Number,
  anonymous: Boolean,
  size: Number,
  files: Array,
  created: Number,
  upvotes: Array,
  downvotes: Array,
  freeleech: Boolean,
  tags: Array,
  group: mongoose.Schema.ObjectId,
  confidenceScore: Number,
  mediaInfo: String,
  isProtected: { type: Boolean, default: false },
  protectedPassword: String,
  protectedLogs: [{
    username: String,
    email: String,
    torrentName: String,
    downloadedAt: { type: Number, default: Date.now },
    passwordUsed: String
  }],
});

Torrent.plugin(fuzzySearch, { fields: ["name"] });

export default mongoose.model("torrent", Torrent);
