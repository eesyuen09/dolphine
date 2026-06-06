# Dolphine

AI relocation demo for finding a Singapore room by comparing commute, cost, lifestyle fit, and rental tradeoffs.

## Requirements

- Node.js
- Python 3
- OpenAI API key

## Setup

```bash
npm run install:all
```

Add your OpenAI key to `backend/.env`:

```bash
OPENAI_MODEL=gpt-5.5
```

## Run The Website

npm start

Then open:

```bash
http://localhost:3000
```

## Build Check

```bash
npm run build
```

## Notes

- Frontend runs on `http://localhost:3000`.
- Backend runs on `http://localhost:4000`.
- Algorithm service runs on `http://localhost:8000`.
- `npm start` starts all three services in one terminal.
