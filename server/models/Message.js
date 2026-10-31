import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '', maxlength: 1000, trim: true },
    image: { type: String, default: '' },
    read: { type: Boolean, default: false }, // read by the other person
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
