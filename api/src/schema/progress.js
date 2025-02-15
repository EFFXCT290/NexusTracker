import mongoose from "mongoose";

const progressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  infoHash: {
    type: String,
    required: true,
  },
  peerId: {
    type: String,
    required: true,
  },
  uploaded: {
    session: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
  },
  downloaded: {
    session: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
  },
  left: {
    type: Number,
    default: 0,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
});

progressSchema.index({ userId: 1, infoHash: 1, peerId: 1 });

export default mongoose.model("Progress", progressSchema);
