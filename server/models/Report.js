import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, default: 'suspicious content', maxlength: 200 },
  },
  { timestamps: true }
);

// One report per user per post
reportSchema.index({ post: 1, reporter: 1 }, { unique: true });

export default mongoose.model('Report', reportSchema);
