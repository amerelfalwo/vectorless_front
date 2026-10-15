# 🌿 Atlas — Document Intelligence Workspace

> **Understand Documents. Discover Knowledge.**
> Production-ready, editorial research workspace for hierarchical tree-based document intelligence and Vectorless RAG.

---

## 🎨 Visual Identity & Design Philosophy

Atlas replaces generic dark chatbot interfaces with an editorial research aesthetic inspired by academic workspaces and premium productivity software:

- **Primary:** Deep Forest Green (`#285943`)
- **Secondary:** Muted Sage (`#8DAA91`)
- **Main Background:** Warm Ivory (`#F7F6F1`)
- **Surfaces:** Pure White (`#FFFFFF`)
- **Typography:** Charcoal (`#262B27`) paired with Google Fonts **Newsreader** (editorial serif headlines) and **Inter** (clean interface body).
- **Selection & Highlights:** Pale Sage (`#E8F0E8`) and Muted Amber (`#B78A45`).

All branding tokens and product metadata are managed centrally in [`src/config/product.js`](src/config/product.js).

---

## ✨ Features

- **🧠 Collective Knowledge Memory (`/knowledge`):**
  - Unified workspace knowledge memory synthesizing insights across all indexed documents.
  - Displays overarching domain themes, key cross-cutting insights, and structured document dossiers.
  - Interactive topic filters and instant action to query across the collective knowledge base.

- **📚 Multi-Document Research Sessions:**
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

- **🔍 Retrieval Transparency Panel:**
  - Expandable multi-stage tracking for real-time visibility into the RAG pipeline:
    1. *Understanding the question*
    2. *Exploring document structure*
    3. *Selecting relevant sections*
    4. *Retrieving supporting evidence*
    5. *Generating final response*

- **📌 Clickable In-Text Citations:**
  - Parses real section titles and page numbers from assistant answers.
  - Clicking any citation automatically opens and highlights the matching node in the Structure Explorer.

- **💬 Structured Research Workspace (`/`):**
  - Collapsible sidebar with date-grouped conversation history (*Today*, *Yesterday*, *Previous 7 Days*, *Older*).
  - Search conversations, inline rename, and deletion actions.
  - Contextual prompt cards for instant research workflows (summarize, compare findings, extract evidence, explain technical concepts).
  - Clean message composer with PDF attachment controls, deep analysis mode toggle, and stop-generation streaming support.

---

## 🛠️ Tech Stack

- **Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite 8](https://vitejs.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with custom `@theme` tokens
- **Typography:** [Google Fonts](https://fonts.google.com/) (Inter & Newsreader)
- **Syntax Highlighting:** [Prism.js](https://prismjs.com/) via `react-syntax-highlighter` (light editorial theme)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Deployment:** [Vercel](https://vercel.com/) (Production: [vectorless-front-8gpg.vercel.app](https://vectorless-front-8gpg.vercel.app))

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/amerelfalwo/vectorless_front.git
cd vectorless_front

# Install dependencies
npm install
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
# Local development backend:
VITE_API_BASE_URL=http://localhost:7860

# Or point to the cloud backend:
# VITE_API_BASE_URL=https://amer003100-vectorless-rag.hf.space
```

### Running Locally

```bash
npm run dev
```

Visit `http://localhost:5173` to explore the workspace.

---

## 📦 Build & Deployment

```bash
# Lint code
npm run lint

# Compile production bundle
npm run build

# Deploy to Vercel Production
npx vercel --prod
```
