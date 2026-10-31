import mongoose from 'mongoose';

export const REPORT_REASONS = ['spam', 'nudity', 'harassment', 'hate', 'violence', 'misinformation', 'other'];

const reportSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: REPORT_REASONS, default: 'other' },
    details: { type: String, default: '', maxlength: 300 },
    status: { type: String, enum: ['open', 'dismissed', 'actioned'], default: 'open', index: true },
  },
  { timestamps: true }
);

// One report per user per post
reportSchema.index({ post: 1, reporter: 1 }, { unique: true });

export default mongoose.model('Report', reportSchema);
