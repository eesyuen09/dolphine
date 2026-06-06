# Agents.md

## Project Shape

Dolphine is a hackathon demo for an AI room decision advisor with a deliberately simple full-stack split:

- `frontend/`: React + TypeScript + Vite + Tailwind CSS.
- `backend/`: Node.js + Express API.
- `backend/listingExtractor.js`: room extraction, mock shortlist, ranking, commute estimates, and optional external API integrations.
- `backend/loadEnv.js`: loads local env files without printing secrets.
- `scripts/dev.mjs`: starts frontend and backend together.

## How To Run

From the repo root:

```bash
npm run install:all
npm start
```

Then open `http://127.0.0.1:3000`.

## Frontend Notes

- `frontend/src/App.tsx` contains the current single-page UI.
- The UI uses the life profile form and built-in room shortlist for the guided demo.
- The frontend calls `POST /api/listings/extract` through Vite's `/api` proxy.

## Backend Notes

- `GET /api/health` checks the API.
- `POST /api/listings/extract` accepts a profile and optional listing inputs, then returns room-shaped recommendations.
- Keep route wiring in `backend/server.js`.
- Keep extraction/ranking logic in `backend/listingExtractor.js`.

## Hackathon Bias

Prefer obvious, fast changes over framework complexity. Avoid auth, migrations, databases, or new services unless they clearly improve the demo.
