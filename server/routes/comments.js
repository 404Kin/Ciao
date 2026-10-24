import express from 'express';
import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import Notification from '../models/Notification.js';
import auth from '../middleware/auth.js';
import { notify, unnotify } from '../utils/notify.js';

const router = express.Router();

// POST /api/comments/:id/like  (toggle)
router.post('/:id/like', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const has = comment.likes.some((id) => String(id) === req.userId);
    if (has) {
      await Comment.updateOne({ _id: comment._id }, { $pull: { likes: req.userId } });
      await unnotify({ user: comment.author, actor: req.userId, type: 'comment_like', post: comment.post });
    } else {
      await Comment.updateOne({ _id: comment._id }, { $addToSet: { likes: req.userId } });
      await notify({
        user: comment.author,
        actor: req.userId,
        type: 'comment_like',
        post: comment.post,
        meta: comment.text.slice(0, 60),
      });
    }
    const fresh = await Comment.findById(comment._id).select('likes');
    res.json({ liked: !has, likesCount: fresh.likes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/comments/:id  (comment author or post author)
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const post = await Post.findById(comment.post).select('author');
    const isOwner = String(comment.author) === req.userId;
    const isPostOwner = post && String(post.author) === req.userId;
    if (!isOwner && !isPostOwner) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // delete the comment and any replies under it
    const replies = await Comment.find({ parent: comment._id }).select('_id');
    const ids = [comment._id, ...replies.map((r) => r._id)];
    await Comment.deleteMany({ _id: { $in: ids } });
    await Notification.deleteMany({ post: comment.post, type: 'comment_like', meta: comment.text.slice(0, 60) });

    if (post) {
      const fresh = await Comment.countDocuments({ post: post._id });
      await Post.updateOne({ _id: post._id }, { $set: { commentsCount: fresh } });
      return res.json({ message: 'Deleted', commentsCount: fresh, removed: ids.map(String) });
    }
    res.json({ message: 'Deleted', removed: ids.map(String) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
