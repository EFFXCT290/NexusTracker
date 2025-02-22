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
    validate: {
      validator: function(v) {
        return v !== null && v !== 'null' && v.length > 0;
      },
      message: 'infoHash cannot be null or empty'
    }
  },
  peerId: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return v !== null && v !== 'null' && v.length > 0;
      },
      message: 'peerId cannot be null or empty'
    }
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
}, {
  timestamps: true
});

progressSchema.index({ 
  userId: 1, 
  infoHash: 1, 
  peerId: 1 
}, { 
  unique: true,
  background: true,
  name: "unique_peer_index"
});

export default mongoose.model("Progress", progressSchema);
