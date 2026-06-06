# Dolphine

An AI relocation agent demo that helps users choose where to live by simulating future lifestyle outcomes instead of only browsing rental listings.

Tagline: **Find a life, not just a room.**

The current app is a polished frontend-only skeleton for a hackathon demo. It uses local mock data to simulate commute burden, lifestyle fit, neighbourhood tradeoffs, future-week routines, and a generated landlord message.

## Stack

- `frontend/`: React, TypeScript, Vite, and Tailwind CSS.
- `backend/`: Node.js, Express, and SQLite kept for later API integration.
- `backend/db/schema.sql`: SQL database definition.
- `backend/db/seed.sql`: demo room and commute data.

## Run Locally

```bash
npm run install:frontend
npm start
```

Open `http://localhost:3000`.

Build the frontend:

```bash
npm run build
```

The legacy backend can still be run separately when API integration resumes:

```bash
npm run install:backend
npm run start:backend
```
