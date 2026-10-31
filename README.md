# Ciao — social app (React + Express + MongoDB)

## Run it
```bash
# 1) backend  (http://localhost:5000)
cd server
npm install
npm run dev          # or: npm start

# 2) frontend (http://localhost:5173)
cd client
npm install
npm run dev
```
`server/.env` needs `MONGO_URI`, `JWT_SECRET`, `PORT`, `CLIENT_URL` (see `.env.example`).
`client/.env` has `VITE_API=http://localhost:5000/api`.
On first start the server adds 5 built-in demo songs to the music library.

## Features
- **Accounts**: register, log in with email *or* username, change password, delete account
- **Profile**: Instagram-style: profile photo only (upload and crop, or pick an avatar, also at sign-up), name, @username, bio, status, location, website, followers / following lists
- **Posts**: text, up to 4 photos/videos, mood, #hashtags, attach a song, edit, delete, save, share link, report
- **Reactions**: 👍 ❤️ 😂 😮 😢 😡 (hover or long-press the Like button)
- **Comments**: add, reply, like, delete
- **Music**: add many songs at once (or drag & drop), or add a song from a direct audio link; global player (play/pause, next/prev, seek, volume, shuffle, repeat, queue), upload your own songs (+cover art), like songs, attach songs to posts
- **Admin & safety**: report posts with a reason, community guidelines page, admin panel (reports queue, remove posts, warn / suspend users, activity log)
- **Messages**: private 1-to-1 chat with text, photos and emoji, unread badge, "Seen", unsend (start from a profile or the New message button)
- **Chains**: tag friends; each adds one photo or line; when everyone is done it becomes a collage story you can save or share to your feed
- **Explore & search**: people, posts, trending tags, popular posts
- **Notifications**: reactions, comments, replies, follows (with unread badge)
- **Settings**: profile, light/dark/device theme, 6 accent colours, music volume, password, delete account
- Fully responsive: sidebar on desktop, bottom tab bar on mobile

## Your own avatars & logo
- **Avatars:** drop image files (png / jpg / webp / svg) into `client/src/assets/avatars/`. They appear automatically in Register and Settings. Delete the 12 sample ones if you don't want them.
- **Logo:** put a square picture at `client/public/logo.png` and it replaces the built-in icon everywhere.
- **Login backgrounds:** put images in `client/public/` and add them to the list in `client/src/components/AuthBackground.jsx`.

## Making yourself an admin
Add your account's email to `server/.env` and restart the server:
```
ADMIN_EMAILS=you@example.com
```
An **Admin** item then appears in the menu. Several emails can be separated with commas.
