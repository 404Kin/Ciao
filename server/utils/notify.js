import Notification from '../models/Notification.js';

// Create (or refresh) a notification. Never notify yourself.
export async function notify({ user, actor, type, post = null, chain = null, meta = '' }) {
  try {
    if (!user || String(user) === String(actor)) return;
    const filter = { user, actor, type, post };
    // Reactions / follows are "state" notifications: refresh instead of piling up
    if (type === 'reaction' || type === 'follow' || type === 'comment_like') {
      await Notification.findOneAndUpdate(
        filter,
        { $set: { meta, read: false, createdAt: new Date() } },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
    } else {
      await Notification.create({ ...filter, chain, meta });
    }
  } catch (err) {
    console.error('notify error:', err.message);
  }
}

export async function unnotify({ user, actor, type, post = null }) {
  try {
    await Notification.deleteMany({ user, actor, type, post });
  } catch {
    /* ignore */
  }
}
