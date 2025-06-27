import mongoose from "mongoose";

const User = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  uid: String,
  torrents: Object,
  created: Number,
  banned: Boolean,
  role: String,
  invitedBy: mongoose.Schema.ObjectId,
  remainingInvites: Number,
  emailVerified: Boolean,
  bonusPoints: Number,
  totp: {
    enabled: Boolean,
    secret: String,
    qr: String,
    backup: [String],
  },
  bookmarks: [mongoose.Schema.ObjectId],
  // ADD LAST SEEN FEATURE
  // Track the last time the user was seen (for activity tracking)
  lastSeen: {
    type: Date,
    default: null,
  },
  // User-specific timezone (IANA format, e.g., 'Europe/Paris'). Optional.
  timezone: {
    type: String,
    default: null,
  },
  // End of Last Seen Feature
});

export default mongoose.model("user", User);
