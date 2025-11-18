# Socket.io Chat — MongoDB-backed

## Overview
Real-time chat built with React (Vite), Socket.io, Node/Express, MongoDB (Mongoose).  
Supports: public chat, private messages, typing indicators, online users, persistent messages & users.

## Setup

### Prereqs
- Node.js (v18+ recommended)
- MongoDB running locally or a MongoDB Atlas URI

### Server
1. `cd server`
2. Copy `.env.example` → `.env` and edit `MONGO_URI` and `CLIENT_URL` if needed
3. `npm install`
4. `npm run dev` (or `npm start`)

Server runs on `PORT` from `.env` (default 5000).

### Client
1. `cd client`
2. `npm install`
3. `npm run dev`
4. Open the app (Vite tells you address — default `http://localhost:5173`)

## How to test
- Open two browser windows/tabs.
- Enter different usernames and join.
- Send messages (public) — they persist to MongoDB.
- Click **Private** next to username to send a private message to that user's socket.
- Typing indicator is shown when other users type.

## API
- `GET /api/messages` — last messages (default 100)
- `GET /api/messages/private/:socketA/:socketB` — private conversation between two socket ids
- `GET /api/users` — all persisted users

## Notes & improvements
- This demo persists users (username only) and messages. Presence (online) is tracked in-memory (socket ids).
- For production consider:
  - persistent authentication (JWT + hashed passwords)
  - mapping persisted user _id to active sockets (so private messages route by user id not socket id)
  - pagination for message history
  - validation & rate limiting
  - storing socket -> user mapping in Redis for multi-process scale

Good luck — paste these files into your project folders and run the server and client. If you want, I can now:
- convert private messaging to use persisted user IDs instead of socket IDs, or
- add JWT auth + login/register flows, or
- add nicer UI styles (Tailwind/Material) and build screenshots for submission.
Which one next?
