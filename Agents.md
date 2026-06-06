# AGENTS.md

## Project Shape

RoomMatch AI is a 1-day hackathon demo with a deliberately simple full-stack split:

- `frontend/`: plain HTML, CSS, and JavaScript. No build step.
- `backend/`: Node.js + Express API backed by SQLite.
- `backend/db/schema.sql`: database tables.
- `backend/db/seed.sql`: demo room data and commute data.

## How To Run

From the repo root:

```bash
npm run install:backend
npm start
```

Then open `http://localhost:3000`.

## Frontend Notes

- `frontend/index.html` is the mode chooser.
- `frontend/chat.html` is the interactive chatbot-style flow.
- `frontend/metric.html` is the structured metric-based flow.
- `frontend/app.js` powers metric mode.
- `frontend/chat.js` powers interactive mode.
- Both frontend scripts call `POST /api/recommendations` for ranked room results.

## Backend Notes

- `GET /api/health` checks the API.
- `GET /api/rooms` returns raw room data from SQLite.
- `POST /api/recommendations` accepts tenant preferences and returns ranked rooms.
- Keep scoring logic in `backend/server.js` unless the project grows enough to justify splitting modules.

## Hackathon Bias

Prefer obvious, fast changes over framework complexity. If adding features, use the existing API response shape and static frontend pages before introducing a frontend framework, auth, migrations, or external services.