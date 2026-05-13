# Vectorless RAG (frontend)

React (Vite) + Tailwind CSS client for the Vectorless RAG FastAPI backend.

## ✨ Features

- **Real-time RAG Interaction**: Seamless chat interface for vectorless RAG.
- **Markdown Support**: Rich text rendering with code syntax highlighting.
- **Responsive Design**: Optimized for all screen sizes using Tailwind CSS 4.
- **Modern UI**: Clean, professional interface with Lucide icons and smooth notifications via Sonner.

## 🛠 Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Markdown**: `react-markdown` + `remark-gfm`
- **Icons**: [Lucide React](https://lucide.dev/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)

## 🚀 Setup

```bash
npm install
npm run dev
```

## Configuration

The application uses environment variables for configuration. You **must** create a `.env` file in the root directory to specify your backend endpoint:

```bash
VITE_API_BASE_URL=https://amer003100-vectorless-rag.hf.space
```

The frontend loads this value via [`src/config.js`](src/config.js). Restart the development server after any changes to `.env`.

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run lint` — ESLint
