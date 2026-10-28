<div align="center">
  <h1>Ciao — A Social Media Platform</h1>
  <p>A full-stack, mood-based social media application built with React, Node.js, Express, and MongoDB.</p>
  
  ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
  ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
</div>

---

## About The Project
**Ciao** is a feature-rich social media platform designed to provide a cozy, aesthetic, and interactive user experience. Unlike traditional social apps, Ciao lets you share your mood, attach music to your posts, and customize your profile with custom themes and emojis. 

This project was built to demonstrate full-stack development skills, including REST API design, database relationship management, authentication, file uploading, and responsive UI/UX design.

---

## ✨ Key Features

- **Authentication & Security:** JWT-based secure login/register with email or username, password hashing, and account deletion.
- **Mood-Based Posting:** Share text, up to 4 photos/videos, and tag your current mood with `#hashtags`.
- **Integrated Music Player:** A global music player (play, pause, seek, volume, shuffle, repeat) to listen to songs while browsing. You can upload your own songs and attach them to posts.
- **Rich Profiles:** Customizable avatars (upload or pick an emoji), cover photos, bio, status, location, and follower/following lists.
- **Deep Interactions:** React with 6 different emojis (👍 ❤️ 😂 😮 😢 😡), comment, reply, like comments, save posts, and report suspicious content.
- **Chains (Collab Stories):** Tag friends to create collaborative posts. Each friend adds a photo/line, and when done, it turns into a shareable collage story!
- **Notifications:** Real-time unread badges for reactions, comments, follows, and replies.
- **Full Customization:** Choose from 10 theme templates, custom app backgrounds, dark/light/system modes, and 6 accent colors.
- **Fully Responsive:** Bottom tab bar on mobile, sidebar on desktop.

---

## Tech Stack

**Frontend:**
- **React (Vite):** For a fast, modern single-page application.
- **Tailwind CSS:** For responsive, utility-first styling.
- **React Router:** For seamless client-side routing.
- **Axios:** For API requests with interceptors.
- **Lucide React:** For beautiful, consistent icons.

**Backend:**
- **Node.js & Express.js:** For building the RESTful API.
- **MongoDB & Mongoose:** For flexible NoSQL database modeling.
- **JSON Web Tokens (JWT):** For secure authentication.
- **Multer:** For handling multipart/form-data (image/video uploads).
- **Bcrypt.js:** For password hashing.

---

## Local Setup & Installation

### Prerequisites
Make sure you have **Node.js** and **MongoDB** installed on your system (or a MongoDB Atlas account).

### 1. Clone the repository
```bash
git clone https://github.com/404Kin/Ciao.git
cd Ciao
