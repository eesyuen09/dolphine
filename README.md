# RoomMatch AI

A quick hackathon demo for helping tenants find suitable rooms faster than browsing property portals or repeatedly prompting a chatbot.

The demo lets a tenant choose structured room metrics such as budget, MRT walking distance, aircon, cooking access, food court access, comfort, and commute area. It then ranks sample rooms with a recommendation score, AI-style explanation, and practical tradeoffs.

## Stack

- `frontend/`: plain HTML, CSS, and JavaScript for fastest hackathon iteration.
- `backend/`: Node.js, Express, and SQLite.
- `backend/db/schema.sql`: SQL database definition.
- `backend/db/seed.sql`: demo room and commute data.

## Run Locally

```bash
npm run install:backend
npm start
```

Open the URL printed in the terminal, usually `http://localhost:3000`. If port `3000` is already in use, the app automatically tries the next available ports.

You can choose a port explicitly:

```bash
PORT=4000 npm start
```

Set `PORT_RETRIES` to control automatic fallback attempts, or `HOST` to bind to a specific host.
