# AI-Powered Collaborative Workspace

A production-quality collaborative editing workspace (similar to Notion) offering nested structures, rich-text styling, real-time sync capabilities, cursor selections, and an integrated Gemini AI writing assistant.

---

## Tech Stack

*   **Frontend:** React (Vite), Tailwind CSS, Framer Motion, TipTap Editor, Socket.io-client, Lucide Icons, Yjs (CRDT)
*   **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.io, Yjs, y-prosemirror, y-protocols
*   **AI Integration:** Google Gemini API (`@google/generative-ai`)
*   **Authentication:** JWT stored in secure HTTP-only cookies

---

## Core Features

1.  **User Authentication:** Signup, Login, and Session management with secure HTTP-only cookie-based tokens.
2.  **Workspace & Folder Management:**
    *   Unlimited nested folders.
    *   Workspace customization with emojis and details.
    *   Optimized single-endpoint Sidebar tree hierarchy generation.
3.  **Real-Time Collaborative Editing:**
    *   Yjs CRDT-based synchronized text updates.
    *   Collaboration boundaries preventing data conflicts.
    *   Server-side active document caching and lazy database loads.
4.  **Cursor Presence & Selections:**
    *   Live cursor pointer tracking with distinct, random collaborator colors.
    *   Live cursor text labels and highlighted selection range decorators.
5.  **Gemini AI Writing Assistant:**
    *   **Slash Commands:** Trigger AI actions immediately in-line typing `/summarize`, `/rewrite`, `/continue`, `/translate`, or `/brainstorm`.
    *   **Style Prompt Templates:** Academic, Professional, Casual, Technical, and Creative rewrites.
    *   **HTML Format Preservation:** Standard elements (lists, headings, blocks) parse natively into editor node structures.
    *   **Context Selectors:** Configurable text contexts using: *Selection*, *Current Paragraph*, or *Entire Document*.
    *   **AI Rate Limiting:** Sliding-window rate limit (max 10 requests per minute per user).
    *   **Operations History:** Recalls last 10 operations for instant previews, insertions, and undo actions.
6.  **Aesthetics:** Sleek Notion-like typography, responsive layout, dark modes, animations, and toast indicators.

---

## Folder Structure

```text
├── client/                     # Frontend Vite React App
│   ├── src/
│   │   ├── components/         # Common UI Elements & Editor
│   │   │   ├── Editor/         # TipTap CollabEditor Component
│   │   ├── context/            # Auth, Toast, and Socket Providers
│   │   ├── pages/              # Login, Signup, Dashboard, Workspace Pages
│   │   ├── services/           # Axios Client API settings
│   │   ├── index.css           # Custom Scrollbars, Carets, Global Styles
│   │   └── App.jsx             # Router Guards & Provider layouts
│   └── package.json
│
├── server/                     # Backend API & Socket Server
│   ├── config/                 # Database Connection Hooks
│   ├── controllers/            # Auth, Workspace, Folder, Document, AI controllers
│   ├── middleware/             # Auth checks, errors, rate limiters
│   ├── models/                 # Mongoose schemas (User, Document, Workspace, Folder)
│   ├── routes/                 # Express API Endpoint Maps
│   ├── services/               # Gemini AI service operations
│   ├── socket.js               # Socket.io Rooms & Yjs sync protocols
│   ├── validators/             # Request payload schema validators
│   ├── server.js               # Express bootstrap and middleware entry point
│   └── package.json
│
├── .gitignore                  # Repository ignore configurations
├── package.json                # Monorepo scripts root definitions
└── README.md                   # Project overview & documentation
```

---

## Installation & Setup

### Prerequisites
*   Node.js (v18+ recommended)
*   MongoDB Instance (Local database or MongoDB Atlas cloud cluster)

### 1. Clone the repository
```bash
git clone <repository-url>
cd ai-collaborative-workspace
```

### 2. Install dependencies
Install backend and frontend packages via the monorepo root:
```bash
# Install root, backend, and frontend packages
npm install
npm install --prefix server
npm install --prefix client
```

### 3. Environment Variables Config
Create a `.env` file in the `server` directory matching [server/.env.example](file:///c:/Users/soura/OneDrive/Pictures/Full_Stack_project/server/.env.example):

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ai_workspace
JWT_SECRET=your_super_secret_jwt_key_change_me_in_production
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
CLIENT_URL=http://localhost:5173
```

---

## Running the Application

### 1. Start Server & Client in Development
Run both services concurrently:

```bash
# Start backend server (starts on Port 5000)
npm run server

# Start frontend client in another terminal (starts on Port 5173)
cd client
npm run dev
```

### 2. Production Compilation & Build
Compile frontend static assets:
```bash
cd client
npm run build
```
Vite compiles and minifies files inside `client/dist/` ready for hosting.

---

## Future Improvements

*   **Version History:** Expand Version History schema to store complete timeline edits.
*   **Comments System:** Threaded comment highlights on editor content blocks.
*   **Advanced Permissions:** Domain-based workspace email restrictions.
*   **AI Chat Panel:** Persistent document-aware sidebar chat helper.

---

## Screenshots

*(Screenshots of nested folder trees, collaborative editors, selection cursor overlays, and AI prompt overlays will be placed here)*

---

## License

This project is licensed under the MIT License.
