import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['reaction', 'comment', 'reply', 'follow', 'comment_like', 'chain_invite', 'chain_add', 'chain_done'],
      required: true,
    },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    chain: { type: mongoose.Schema.Types.ObjectId, ref: 'Chain', default: null },
    meta: { type: String, default: '' }, // e.g. reaction type or comment snippet
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
