# Dolphine

Dolphine is an AI room decision advisor for renters. Instead of only comparing neighborhoods, it helps a user compare specific room listings against commute, budget, room fit, MRT access, lifestyle tradeoffs, and landlord-risk questions.

Tagline: **Find a life, not just a room.**

## What Is In This Repo

- `frontend/`: the current app. React + TypeScript + Vite + Tailwind CSS.
- `backend/`: Express API for room extraction, ranking, and optional external API integrations.
- `scripts/dev.mjs`: starts the frontend and backend together for local development.


## Prerequisites

Install these before starting:

- `Node.js`
  Recommended: Node 20 or newer.
- `npm`
  Comes with Node.js.
- `git`
  Only needed if you are cloning the repo yourself.

Check your versions:

```bash
node -v
npm -v
```

## Getting The Repo

If you already have the repo locally, move to the next section.

If not:

```bash
git clone <your-repo-url>
cd dolphine
```

## Quick Start

This is the simplest path for a completely new user.

1. Install dependencies:

```bash
npm run install:all
```

2. Start the full app:

```bash
npm start
```

3. Open the local URL shown in the terminal.

Default:

```text
http://127.0.0.1:3000
```

`npm start` starts both services:

- frontend: `http://127.0.0.1:3000`
- backend API: `http://127.0.0.1:4000`

The frontend proxies `/api` requests to the backend during local development.

## Frontend Commands

From the repo root:

- Start the full frontend + backend dev app:

```bash
npm start
```

- Same as start:

```bash
npm run dev
```

- Start only the frontend:

```bash
npm run start:frontend
```

- Build the frontend for production:

```bash
npm run build
```

- Preview the built frontend locally:

```bash
npm run preview
```

## Backend Commands

The backend powers listing extraction and room ranking for the current UI.

Install backend dependencies:

```bash
npm run install:backend
```

Start the backend:

```bash
npm run start:backend
```

Start the backend in watch mode:

```bash
npm run dev:backend
```

Default backend URL:

```text
http://localhost:3000
```

Important:

- `npm start` runs the backend on `127.0.0.1:4000` and the frontend on `127.0.0.1:3000`.
- `npm run start:backend` runs only the backend and uses the backend default port `3000` unless `PORT` is set.
- For a production-style local run, use `npm run start:prod`. It builds the frontend and serves it from Express.

## Listing Extraction API

Phase 1 backend integration starts with:

```text
POST /api/listings/extract
```

The endpoint accepts pasted room text, pasted URLs, or multiple listing entries:

```json
{
  "profile": {
    "destinationInput": "NUS School of Computing",
    "budgetMin": 900,
    "budgetMax": 1500,
    "officeDays": 5,
    "transportMode": "MRT/Bus",
    "preferredRoomType": "Common room",
    "mustHaves": ["Aircon", "Cooking allowed", "No owner staying"],
    "rankedPriorities": ["Short commute", "Near MRT", "Gym access"]
  },
  "listings": [
    "Queenstown common room, S$1450/month, 6 min walk to Queenstown MRT, 3B2B, aircon, wifi included, cooking allowed.",
    {
      "url": "https://example.com/listings/queenstown-common-room"
    }
  ]
}
```

It returns `rooms` and `extractedRooms` using the same room-first shape the frontend already expects: title, area, rent, room type, unit type, nearest MRT, MRT walk time, commute minutes, amenities, pros, cons, hidden risks, confidence, and ranking label.

External validation and commute estimates use these optional environment variables:

```bash
OPENAI_API_KEY=<openai-api-key>
OPENAI_MODEL=gpt-4.1-mini
OPENAI_API_TIMEOUT_MS=15000
ONEMAP_ACCESS_TOKEN=<one-map-token>
ONEMAP_EMAIL=<one-map-account-email>
ONEMAP_PASSWORD=<one-map-password>
SGLOCATE_API_KEY=<sg-locate-key>
SGLOCATE_API_SECRET=<sg-locate-secret>
ENABLE_LISTING_URL_FETCH=false
```

Notes:

- Put secrets in `backend/.env` or `backend/.env.local`. These files are ignored by git.
- If `OPENAI_API_KEY` is set, listing extraction is AI-first and uses the local parser as fallback.
- If `OPENAI_API_KEY` is set, URL-only listings are fetched by the backend and the cleaned page text is sent to OpenAI for extraction.
- If `ONEMAP_ACCESS_TOKEN` is not set, the backend can generate a OneMap token from `ONEMAP_EMAIL` and `ONEMAP_PASSWORD`.
- Postal codes are validated with OneMap Search first, then SG Locate if configured.
- Commute is computed with OneMap Routing when OneMap credentials are available.
- Without external credentials, the endpoint uses local demo estimates and returns warnings where validation cannot be completed.
- Set `ENABLE_LISTING_URL_FETCH=false` to disable backend URL fetching.

## Recommended Local Workflows

### Frontend-only demo work

Use this when working on the current product demo:

```bash
npm run install:all
npm start
```

### Backend-only work

Use this if you are debugging or extending the Express API:

```bash
npm run install:backend
npm run start:backend
```

### Build check before shipping changes

Use this before committing frontend changes:

```bash
npm run build
```

## Project Structure

```text
dolphine/
├── frontend/
│   ├── src/
│   │   └── App.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── backend/
│   ├── listingExtractor.js
│   ├── loadEnv.js
│   ├── package.json
│   └── server.js
├── scripts/
│   └── dev.mjs
├── package.json
└── README.md
```

## Current Product Behavior

The current frontend demo includes:

- destination autocomplete with curated Singapore destinations and MRT stations
- custom location helper with MRT/postal-code validation
- room-first recommendation flow
- built-in room shortlist for the guided demo
- extracted room cards
- ranked room recommendations
- room deep dive
- tradeoff analysis
- future-life simulation
- landlord questions and message draft

The current frontend calls `POST /api/listings/extract` when the user clicks `Analyze Rooms`. If the backend is unavailable, it falls back to local sample rooms so the demo still renders.

## Troubleshooting

### `npm start` fails because port `3000` or `4000` is busy

Usually Vite will auto-switch to another port. Read the terminal output and open the URL it prints.

### `npm run install:all` fails

Check:

- your Node.js version
- your npm version
- whether you have network access
- whether another install process is already running

Then retry the install command.

### The page opens but looks broken

Run a clean frontend build:

```bash
npm run build
```

If build passes, restart the full dev app:

```bash
npm start
```

### Frontend and backend ports

Use `npm start` for the normal full-stack dev flow. It avoids the port conflict by running the backend on `4000` and the frontend on `3000`.

## For New Contributors

If you are joining the project fresh, use this order:

1. Install Node.js 20+.
2. Clone the repo.
3. Run `npm run install:all`.
4. Add optional API keys to `backend/.env`.
5. Run `npm start`.
6. Open the local URL from the terminal.
7. Run `npm run build` before submitting changes.

If you later need API work:

1. Run `npm run install:backend`.
2. Start the backend with `npm run start:backend`.
3. Inspect `backend/server.js` and `backend/listingExtractor.js`.

## Notes

- Root scripts are the main entrypoints. You usually do not need to `cd frontend` or `cd backend`.
- The dev frontend binds to `127.0.0.1:3000`.
- The dev backend binds to `127.0.0.1:4000` when started through `npm start`.
- The backend uses Express and local mock room data with optional OpenAI, OneMap, and SG Locate integrations.
