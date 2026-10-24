import mongoose from 'mongoose';

export const MOODS = [
  'happy', 'sad', 'excited', 'thoughtful',
  'grateful', 'angry', 'calm', 'love',
];
export const REACTIONS = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], default: 'image' },
  },
  { _id: false }
);

const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: REACTIONS, default: 'like' },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, default: '', maxlength: 2000, trim: true },
    media: { type: [mediaSchema], default: [] },
    mood: { type: String, enum: MOODS, default: 'calm' },
    tags: { type: [String], default: [], index: true },
    song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song', default: null },

    reactions: { type: [reactionSchema], default: [] },
    commentsCount: { type: Number, default: 0 },
    edited: { type: Boolean, default: false },

    reports: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reportCount: { type: Number, default: 0 },
    hidden: { type: Boolean, default: false },

    // Legacy fields (old posts from the first version of Ciao)
    image: { type: String, default: '' },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    suspicious: { type: Boolean, default: false },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });

export default mongoose.model('Post', postSchema);
