/**
 * Base URL for the Vectorless RAG FastAPI backend.
 * Override with `VITE_API_BASE_URL` in `.env` (no trailing slash).
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''
