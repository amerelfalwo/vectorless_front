# Vectorless RAG (frontend)

React (Vite) + Tailwind CSS client for the Vectorless RAG FastAPI backend.

## Setup

```bash
npm install
npm run dev
```

## Configuration

The API base URL defaults to `https://amer003100-vectorless-rag.hf.space` in [`src/config.js`](src/config.js).

To override locally, create a `.env` file:

```bash
VITE_API_BASE_URL=https://your-endpoint.example
```

Restart the dev server after changing environment variables.

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run lint` — ESLint
