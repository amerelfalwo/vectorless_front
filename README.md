# 🌿 Atlas — Document Intelligence Workspace

> **Understand Documents. Discover Knowledge.**<br>
> Production-ready, editorial research workspace for hierarchical tree-based document intelligence, Vectorless RAG, and NotebookLM-style study tooling.

---

## 📑 Table of Contents
1. [Overview](#-overview)
2. [Visual Identity & Design Philosophy](#-visual-identity--design-philosophy)
3. [Features](#-features)
4. [Backend Integration](#-backend-integration)
5. [Tech Stack](#-tech-stack)
6. [Project Structure](#-project-structure)
7. [Getting Started](#-getting-started)
8. [Scripts & Deployment](#-scripts--deployment)

---

## 🌟 Overview

**Atlas Frontend** is an editorial-grade research client built with React 19, Vite 8, and Tailwind CSS v4. Communicating seamlessly with the **Atlas Vectorless RAG** backend, it provides hierarchical document tree navigation, real-time streaming answer synthesis with verifiable citations, collective workspace memory synthesis, concurrent multi-session research, and an interactive Study Studio for visual mind mapping and active-recall quizzes.

---

## 🎨 Visual Identity & Design Philosophy

Atlas replaces generic dark chatbot interfaces with an editorial research aesthetic inspired by academic workspaces and premium productivity software:

- **Primary:** Deep Forest Green (`#285943`) · Hover (`#1e4533`) · Active (`#173729`)
- **Secondary:** Muted Sage (`#8DAA91`)
- **Main Background:** Warm Ivory (`#F7F6F1`)
- **Surfaces:** Pure White (`#FFFFFF`)
- **Typography:** Charcoal (`#262B27`) and Muted Text (`#777D76`)
  - **Interface (Sans):** Inter (`var(--font-sans)`)
  - **Headlines (Serif):** Newsreader (`var(--font-serif)`)
  - **Code & Pages (Mono):** JetBrains Mono (`var(--font-mono)`)
- **Borders:** Warm Border (`#E4E5DE`) · Subtle Border (`#ECEEE7`)
- **Selection & Highlights:** Pale Sage (`#E8F0E8`) · Muted Amber (`#B78A45`) · Light Amber (`#F7F2E8`)
- **Web Source Badges:** Sky Blue (`#0284C7`) · Web Surface (`#F0F9FF`) · Web Border (`#BAE6FD`)

All branding tokens and product metadata are managed centrally in [`src/config/product.js`](src/config/product.js), and CSS variables are configured via `@theme` in [`src/index.css`](src/index.css).

---

## ✨ Features

- **🎓 Study Studio (`/studio`):**
  - **Tiered Mind Map Canvas:** Automatically renders the document's hierarchical outline tree and key concept findings across visual tiers (Tier 0: Root Document, Tier 1: Major Chapters & Dossier Themes, Tier 2: Sub-sections and Topics). Built with pure HTML/CSS/SVG—no external graph or canvas dependencies.
  - **Canvas Controls:** Real-time search filter for graph nodes, zoom controls (zoom in, zoom out, reset view).
  - **Node Inspector Drawer:** Clicking any node slides out a details drawer displaying node type, physical page number, section title, and section summary.
  - **Deep Navigation Actions:** "Jump to Section in Explorer" immediately opens the Document Structure Explorer on that exact node; "Research in Chat" seeds the active chat prompt with that section concept.
  - **Grounded AI Quizzes & Flashcards:**
    - *Multiple Choice (MCQ):* 5 questions with options A/B/C/D, instant validation, answer explanations, and citation badges.
    - *Active-Recall Flashcards:* 5 cards with 3D flip card toggle, mastery tracker ("Mark as Mastered"), and citation jump buttons.
    - *Clickable Citations:* Clicking `(Section: "...", Page: X)` triggers instant jump-to-page navigation in the Explorer.
    - *Regenerate:* Generates fresh quizzes on demand.

- **🔍 Retrieval Transparency Panel:**
  - Real-time expandable multi-stage pipeline tracking for complete visibility into the Vectorless RAG process:
    - *Document Upload (optional):* Upload document ➔ Constructing document tree index
    - *Query Understanding:* Understand question (*Analyzing question and information requirements*)
    - *Structure Exploration:* Explore document structure (*Navigating section hierarchy and outline*)
    - *Section Selection:* Select relevant sections (*Matching query intent against document nodes*)
    - *Evidence Retrieval:* Retrieve supporting evidence (*Extracting grounded section text and passages*)
    - *Response Synthesis:* Generate final response (*Synthesizing evidence into structured response*)
  - Displays per-stage duration in milliseconds/seconds and node counts retrieved via Server-Sent Event (`<!--STAGE:...-->`) markers.

- **📌 Verifiable In-Text Citations & Source Badges:**
  - **PDF Document Badges:** Parses explicit section titles and physical page numbers (`ص X` / `p. X`). Clicking toggles an expanded source drawer and opens/highlights the matching node in the Document Structure Explorer.
  - **Web & FastMCP Source Badges:** Sky-blue badges with domain names and external links for DuckDuckGo and arXiv citations. Clicking opens the source URL in a new tab with `rel="noopener,noreferrer"`.

- **⚡ Concurrent Multi-Session Streaming & Unread Badges:**
  - **Background Concurrency:** Switching between research sessions does not abort active responses; ongoing streams continue in the background via session stream refs and message buffers.
  - **Sidebar Unread Indicators:** Finished background research sessions display an animated red dot badge (`unreadSessionIds`) until inspected.
  - **Background Processing Indicator:** Sessions currently generating or indexing in the background display an animated loader badge in the sidebar.
  - **Local Session Caching:** Conversation sessions, active session ID, and message histories are cached locally in `localStorage` (`sessionsStorage.js`) and merged seamlessly with backend history on load.

- **🧠 Collective Knowledge Memory (`/knowledge`):**
  - Synthesizes collective workspace intelligence across all indexed documents.
  - Displays overarching domain themes, key cross-cutting insights, and per-document executive dossiers.
  - Interactive topic filters and instant action to query across the collective knowledge base or re-synthesize memory.

- **📚 Multi-Document Research Sessions (`/`):**
  - Attach multiple PDFs to a single research conversation to cross-examine and compare evidence.
  - Top navigation chips with instant detachment and an "+ Attach from Library" popover.
  - **Strict Session Isolation:** Complete state and history isolation between chat sessions—zero cross-session data leakage.

- **📑 Dedicated Document Library (`/documents`):**
  - Searchable inventory table of all ingested documents.
  - Document metrics: file size, page count, hierarchical section count, and indexing status.
  - Drag-and-drop PDF dropzone with instantaneous client validation.
  - Direct actions to initiate research, inspect structure, retry indexing, or delete documents.

- **🌳 Interactive Document Structure Explorer:**
  - Secondary slide-over panel displaying the full outline tree of the active document.
  - Collapsible nested sections with depth indentation and physical page badges.
  - Section-level search and "Inquire" button to target questions at specific nodes.

- **💬 Structured Research Workspace (`/`):**
  - Collapsible sidebar with date-grouped conversation history (*Today*, *Yesterday*, *Previous 7 Days*, *Older*).
  - Search conversations, inline rename, and deletion actions.
  - Contextual prompt cards for instant research workflows (summarize, compare findings, extract evidence, explain technical concepts).
  - Clean message composer with PDF attachment controls, deep analysis mode toggle, voice dictation (Web Speech API), and stop-generation streaming support.

---

## 🔌 Backend Integration

The Atlas frontend communicates with the **[Atlas Backend (pageindex_RAG)](https://github.com/amerelfalwo/pageindex_RAG)** over JSON REST endpoints (via Axios) and Server-Sent Event (SSE) streams (via Fetch `ReadableStream`):

- **Live Backend:** [`https://amer003100-vectorless-rag.hf.space`](https://amer003100-vectorless-rag.hf.space)
- **Interactive Swagger Docs:** [`https://amer003100-vectorless-rag.hf.space/docs`](https://amer003100-vectorless-rag.hf.space/docs)

### API Endpoints Used:

| Endpoint Group | Method & Route | Frontend Function (`src/api/client.js`) |
|---|---|---|
| **Research & Streaming** | `POST /ask` | `streamAsk({ ... })` (SSE stream with stage markers) |
| **Chat Sessions** | `POST /chat/new` | `createChat()` |
| | `GET /chats` | `listChats()` |
| | `GET /chat/{id}/history` | `fetchChatHistory(chatId)` |
| | `POST /chat/{id}/attach` | `attachDocumentToChat(chatId, docId)` |
| | `POST /chat/{id}/attach-multiple` | `attachMultipleDocuments(chatId, docIds)` |
| | `GET /chat/{id}/documents` | `fetchChatDocs(chatId)` |
| | `DELETE /chat/{id}/document/{docId}` | `detachSpecificDocument(chatId, docId)` |
| | `DELETE /chat/{id}/document` | `detachDocumentFromChat(chatId)` |
| | `PATCH /chat/{id}/title` | `renameChat(chatId, title)` |
| | `DELETE /chat/{id}` | `deleteChat(chatId)` |
| **Document Ingestion** | `POST /upload` | `uploadDocument(file, chatId)` |
| | `GET /documents` | `listDocuments()` |
| | `GET /documents/{id}` | `fetchDocumentDetails(documentId)` |
| | `GET /documents/{id}/status` | `fetchDocumentStatus(documentId)` |
| | `GET /documents/{id}/tree` | `fetchDocumentTree(documentId)` |
| | `POST /documents/{id}/retry` | `retryDocumentIndexing(documentId)` |
| | `DELETE /documents/{id}` | `deleteDocument(documentId)` |
| **Workspace Memory** | `GET /memory/knowledge` | `fetchGlobalKnowledge()` |
| | `POST /memory/knowledge/refresh` | `refreshGlobalKnowledge()` |
| | `GET /memory/chat/{chatId}` | `fetchChatMemoryContext(chatId)` |
| | `POST /memory/chat/{chatId}/summarize` | `forceSummarizeChat(chatId)` |
| **Study Studio** | `GET /studio/{docId}/mindmap` | `fetchMindMap(docId)` |
| | `POST /studio/{docId}/quiz` | `generateQuiz(docId, payload)` |

---

## 🛠️ Tech Stack

| Technology | Exact Version | Role in Workspace |
|---|---|---|
| **[React](https://react.dev/)** | `^19.2.6` | Modern UI library with Concurrent Mode, hooks, and refs |
| **[Vite](https://vitejs.dev/)** | `^8.0.12` | Next-generation frontend build tool and sub-second HMR dev server |
| **[Tailwind CSS](https://tailwindcss.com/)** | `^4.3.0` | Utility-first CSS engine with custom `@theme` CSS tokens |
| **[@tailwindcss/vite](https://tailwindcss.com/)** | `^4.3.0` | Official Vite plugin for Tailwind CSS v4 integration |
| **[Axios](https://axios-http.com/)** | `^1.16.0` | HTTP client for JSON REST API queries with upload progress tracking |
| **[Lucide React](https://lucide.dev/)** | `^1.14.0` | Clean, accessible vector icons for the entire UI |
| **[React Markdown](https://github.com/remarkjs/react-markdown)** | `^10.1.0` | Renders assistant answers as semantic HTML |
| **[Remark GFM](https://github.com/remarkjs/remark-gfm)** | `^4.0.1` | GitHub Flavored Markdown plugin (tables, strikethrough, autolinks) |
| **[React Syntax Highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter)** | `^16.1.1` | Prism syntax highlighter (`oneLight` light theme) with copy button |
| **[Sonner](https://sonner.emilkowal.ski/)** | `^2.0.7` | Toast notification manager for errors, jumps, and upload statuses |

> [!NOTE]
> **Zero External Graph or Routing Libraries:** The interactive mind map is built purely with native DOM, SVG, and CSS flex/scale transforms—no heavy graph canvas runtimes (React Flow, Cytoscape, D3) are imported. URL routing is synchronized directly with browser history (`window.location.pathname` and `window.history.pushState`) without `react-router-dom`.

---

## 📁 Project Structure

```text
src/
├── api/
│   └── client.js             # Axios REST client, upload tracking, and fetch SSE stream parser
├── assets/
│   └── atlas_logo_icon.png   # Brand identity images and icons
├── components/
│   ├── AgentActivity.jsx     # Retrieval transparency timeline with durations and step icons
│   ├── AtlasLogo.jsx         # SVG branding component with configurable size and text
│   ├── CenterNotification.jsx# Floating notification for completed background streams
│   ├── ChatInput.jsx         # Message composer with file attachment, deep analysis toggle, and Web Speech dictation
│   ├── ChatLayout.jsx        # Responsive three-column layout (collapsible sidebar, chat area, structure explorer)
│   ├── CodeBlock.jsx         # Prism syntax highlighter with copy-to-clipboard functionality
│   ├── DocumentCard.jsx      # Compact attachment pill displayed above message composer
│   ├── DocumentLibrary.jsx   # Document inventory table with drag-and-drop dropzone and status polling
│   ├── DocumentStructureExplorer.jsx # Collapsible recursive section tree explorer with page badges
│   ├── EmptyState.jsx        # Starter prompt cards and hero layout for new sessions
│   ├── EmptyStateDropzone.jsx# Quick-upload dropzone shown on empty workspace
│   ├── ErrorState.jsx        # Fallback error presentation for failed operations
│   ├── KnowledgeMemoryView.jsx # Workspace collective knowledge dossiers and topic filters
│   ├── MessageBubble.jsx     # User & assistant chat turns with markdown and source badge integration
│   ├── MessageList.jsx       # Virtualized turn container with auto-scroll and streaming caret
│   ├── Sidebar.jsx           # Date-grouped session history, unread badges, and primary view tabs
│   ├── SourceList.jsx        # Attributed PDF page badges and clickable web source chips
│   ├── StreamingIndicator.jsx# Pulse animation displayed while waiting for the first stream chunk
│   ├── StudyStudioView.jsx   # Interactive tiered mind map canvas and active-recall quiz / flashcards
│   └── VectorlessLogo.jsx    # Vectorless branding emblem
├── config/
│   └── product.js            # Centralized product metadata, branding names, and model descriptions
├── config.js                 # Network configuration: resolves VITE_API_BASE_URL (defaults to relative '')
├── index.css                 # Tailwind v4 import, custom @theme color/font tokens, and markdown styling
├── lib/
│   ├── activity.js           # Multi-step RAG pipeline status constants and duration formatters
│   ├── citations.js          # Regex parser extracting PDF (Section, Page) and Web Markdown links
│   └── sessionsStorage.js    # LocalStorage cache layer for chat sessions and message turn history
└── main.jsx                  # Application entry point with React StrictMode and Sonner Toaster
```

### Configuration Files:
- [`src/config.js`](src/config.js): Runtime network configuration that resolves `API_BASE_URL` from `import.meta.env.VITE_API_BASE_URL`.
- [`src/config/product.js`](src/config/product.js): Centralized product branding (`name`, `tagline`, `category`, `models`, `version`).

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** 18+ (Node.js 20+ recommended for modern ESM build tools)
- **Package Manager:** `npm` (or `yarn`, `pnpm`)

### Installation

```bash
# Clone the frontend repository
git clone https://github.com/amerelfalwo/vectorless_front.git
cd vectorless_front

# Install dependencies
npm install
```

### Environment Configuration

Create a `.env` file in the project root:

```env
# Local development against local FastAPI backend (default port 7860):
VITE_API_BASE_URL=http://localhost:7860

# Or point directly to cloud deployment:
# VITE_API_BASE_URL=https://amer003100-vectorless-rag.hf.space
```

> [!IMPORTANT]
> - `VITE_API_BASE_URL` has no trailing slash.
> - If `VITE_API_BASE_URL` is omitted or left empty, the client defaults to `""` (relative/same-origin URLs).
> - Ensure the backend includes your frontend origin (e.g. `http://localhost:5173` or your Vercel domain) in its FastAPI `CORSMiddleware` configuration (`allow_origins`).

### Running Locally

```bash
npm run dev
```

The Vite development server will start at `http://localhost:5173`.

---

## 📦 Scripts & Deployment

### NPM Scripts

These scripts are defined in [`package.json`](package.json):

| Command | Action |
|---|---|
| `npm run dev` | Starts Vite local development server with Hot Module Replacement (HMR) |
| `npm run build` | Compiles and bundles production-ready assets into the `dist/` directory |
| `npm run lint` | Executes ESLint against the entire codebase |
| `npm run preview` | Spins up a local static server to preview the built `dist/` bundle |

### Production Deployment

The production application is continuously deployed to [Vercel](https://vercel.com/):

- **Production URL:** [`https://vectorless-front-8gpg.vercel.app`](https://vectorless-front-8gpg.vercel.app)
- **Production Build Command:** `npm run build`
- **Output Directory:** `dist`
