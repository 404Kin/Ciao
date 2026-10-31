import mongoose from 'mongoose';

// Audit trail: every moderation action is recorded here
const adminActionSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // e.g. remove_post, ban_user, warn_user
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true }
);

export default mongoose.model('AdminAction', adminActionSchema);
