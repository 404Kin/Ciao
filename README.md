<div align="center">
  <h1>Ciao</h1>
  <p>A full-stack social media app with mood posts, a built-in music player, private messages and collaborative collage stories.</p>

  ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
  ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
  ![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
  ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
</div>

---

## About

**Ciao** is a social platform where you share moments with friends and listen to music while you browse. You can post photos and videos with a mood, attach a song to a post, chat privately, and build collage stories together with friends.

The project covers a complete full-stack workflow: REST API design, MongoDB relationships, JWT authentication, file uploads, moderation tools and a responsive interface.

---

## Features

**Accounts**
- Register and log in with email or username (JWT, bcrypt password hashing)
- Change password and delete account
- Instagram-style profile: profile photo only, uploaded with a crop tool or chosen from avatar images (also available at sign-up)
- Name, @username, bio, status, location, website, followers and following lists

**Posts**
- Text, up to 4 photos or videos, a mood, `#hashtags`
- Attach a song from the music library
- Edit, delete, save, share a link, report
- Six reactions (like, love, haha, wow, sad, angry), threaded comments with likes and replies
- Profile shows a square post grid, plus a timeline view

**Music**
- Global player that keeps playing while you browse: play/pause, next/previous, seek, volume, shuffle, repeat, queue
- Upload many songs at once, drag and drop them onto the Music page, or add a song from a direct audio link
- Cover art, likes, a liked-songs list, built-in demo songs

**Messages**
- Private 1-to-1 chat with text, photos and emoji
- Unread badge, "Seen" status, unsend

**Chains (collage stories)**
- Start a chain, tag friends, and each tagged person adds one photo or line
- Only tagged people can contribute
- When everyone is done (or the owner finishes it) it becomes a collage you can save as a picture or share to your feed

**Explore and notifications**
- Search people, posts and hashtags, trending tags, popular posts
- Notifications for reactions, comments, replies, follows, chains and moderator notices

**Moderation and safety**
- Report posts with a reason; posts with several reports are hidden until reviewed
- Admin panel: overview, reports queue, user list, activity log
- Admins can remove posts, send warnings, suspend accounts (days or permanent) and grant admin rights
- Community guidelines page, suspended accounts cannot log in

**Interface**
- Light, dark or device theme, six accent colours
- Changeable background picture on the login and sign-up pages
- Responsive layout: sidebar on desktop, bottom tab bar on mobile

---

## Tech Stack

**Frontend**
- React 19 with Vite
- Tailwind CSS
- React Router
- Axios (with interceptors)
- Lucide React icons

**Backend**
- Node.js and Express
- MongoDB with Mongoose
- JSON Web Tokens
- Multer for file uploads
- bcryptjs for password hashing

---

## Project Structure

```
Ciao/
├── client/                 React app (Vite)
│   ├── public/             Static files (favicon, login backgrounds)
│   └── src/
│       ├── assets/avatars/ Avatar images shown at sign-up and in settings
│       ├── components/     Shared UI (post card, composer, music player, ...)
│       ├── context/        Auth, theme, music and toast state
│       ├── pages/          Home, Profile, Messages, Chains, Admin, ...
│       └── utils/          API client, helpers
└── server/                 Express API
    ├── middleware/         Auth, uploads
    ├── models/             Mongoose models
    ├── routes/             REST endpoints
    ├── utils/              Serializers, notifications
    └── uploads/            Uploaded files (git-ignored, demo songs included)
```

---

## Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) 18 or newer
- A MongoDB database: a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster or a local MongoDB

### 1. Clone the repository
```bash
git clone https://github.com/404Kin/Ciao.git
cd Ciao
```

### 2. Set up the server
```bash
cd server
npm install
```

Create `server/.env` (see `server/.env.example`):

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/ciao
JWT_SECRET=use-a-long-random-string
CLIENT_URL=http://localhost:5173
ADMIN_EMAILS=you@example.com
```

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign login tokens |
| `CLIENT_URL` | Frontend address allowed by CORS (comma separate several) |
| `ADMIN_EMAILS` | Emails that become admins (comma separated, optional) |

Start the server:
```bash
npm run dev
```
It runs on `http://localhost:5000`. On first start it adds 5 demo songs to the music library.

### 3. Set up the client
Open a second terminal:
```bash
cd client
npm install
npm run dev
```
The app opens on `http://localhost:5173`. The client reads the API address from `client/.env`:
```env
VITE_API=http://localhost:5000/api
```

### 4. Become an admin
Register a normal account, put its email in `ADMIN_EMAILS` in `server/.env`, and restart the server. An **Admin** item then appears in the menu. There is no separate admin password; you log in with the account's own password.

---

## Customisation

- **Avatars:** drop image files (png, jpg, webp, svg) into `client/src/assets/avatars/`. They show up automatically in sign-up and settings.
- **Logo:** put a square picture at `client/public/logo.png` to replace the built-in icon.
- **Login backgrounds:** add images to `client/public/` and list them in `client/src/components/AuthBackground.jsx`.
- **Fonts and colours:** `client/tailwind.config.js` and `client/src/index.css`.

---

## API Overview

| Area | Base path |
| --- | --- |
| Auth | `/api/auth` |
| Users and follows | `/api/users` |
| Posts, reactions, comments | `/api/posts`, `/api/comments` |
| Songs | `/api/songs` |
| Messages | `/api/messages` |
| Chains | `/api/chains` |
| Notifications | `/api/notifications` |
| Admin (admins only) | `/api/admin` |

All routes except register and login need an `Authorization: Bearer <token>` header.

---

## Notes

- Uploaded files are stored on disk in `server/uploads/`. Back this folder up or move to cloud storage before deploying.
- Messages and notification badges refresh by polling every few seconds, not WebSockets.
- Never commit `server/.env`. It is listed in `.gitignore`.

---

## Author

Made by [404Kin](https://github.com/404Kin).
