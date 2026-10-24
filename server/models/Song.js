import mongoose from 'mongoose';

const songSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    artist: { type: String, default: 'Unknown artist', trim: true, maxlength: 60 },
    url: { type: String, required: true }, // /uploads/songs/xxx.mp3
    cover: { type: String, default: '' }, // optional cover image url
    duration: { type: Number, default: 0 }, // seconds
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDemo: { type: Boolean, default: false },
    external: { type: Boolean, default: false }, // streamed from a link instead of an uploaded file
    plays: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model('Song', songSchema);
