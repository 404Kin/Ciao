import mongoose from 'mongoose';

// A private 1-to-1 chat between two people
const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    lastText: { type: String, default: '' },
    lastSender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lastAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Conversation', conversationSchema);
