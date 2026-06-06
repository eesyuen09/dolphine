# Dolphine

AI relocation demo for finding a Singapore room by comparing commute, cost, lifestyle fit, and rental tradeoffs.

## Requirements

- Node.js
- Python 3
- OpenAI API key

## Setup

```bash
cp .env.example .env
npm run install:frontend
npm run install:backend
```

Edit `.env`:

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.5
VITE_API_PROXY_TARGET=http://localhost:4000
```

## Run The Website

Open three terminals:

```bash
npm run start:algo
```

```bash
npm run start:backend
```

```bash
npm start
```

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
- If backend uses another port, update `VITE_API_PROXY_TARGET`.
