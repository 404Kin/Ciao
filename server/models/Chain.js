import mongoose from 'mongoose';

const entrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '', maxlength: 140, trim: true },
    image: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// A "chain post": the owner tags people, each tagged person adds ONE photo / line,
// and when everyone is done (or the owner finishes it) it becomes a collage story.
const chainSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    invited: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    entries: { type: [entrySchema], default: [] },
    status: { type: String, enum: ['open', 'done'], default: 'open' },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Chain', chainSchema);
