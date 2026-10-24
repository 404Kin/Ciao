import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },

    // Profile
    avatar: { type: String, default: '' }, // 'preset:<file>' (avatar image shipped with the app) or a legacy emoji
    avatarUrl: { type: String, default: '' }, // uploaded photo
    cover: { type: String, default: '' }, // uploaded cover photo
    bio: { type: String, default: 'Just joined Ciao ✨', maxlength: 200 },
    status: { type: String, default: '', maxlength: 80 },
    location: { type: String, default: '', maxlength: 60 },
    website: { type: String, default: '', maxlength: 100 },

    // Social graph
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    saved: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],

    // Legacy fields (kept so old accounts still load)
    streak: { type: Number, default: 1 },
    badges: { type: [String], default: ['newcomer'] },
  },
  { timestamps: true }
);

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

export default mongoose.model('User', userSchema);
