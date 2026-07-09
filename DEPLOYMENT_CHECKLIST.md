# Production Deployment Checklist

This guide outlines step-by-step instructions for deploying the Collaborative Workspace Platform to production using **MongoDB Atlas**, **Render**, and **Vercel**.

---

## 1. Database Setup: MongoDB Atlas

1.  **Create Account & Cluster:**
    *   Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
    *   Deploy a free shared cluster (e.g. `M0 Sandbox`) select your preferred cloud provider and region.
2.  **Database User:**
    *   Navigate to **Database Access** under Security.
    *   Click **Add New Database User**. Choose Password authentication, configure credentials, and grant the role `Read and write to any database`.
3.  **Network Whitelisting:**
    *   Navigate to **Network Access** under Security.
    *   Click **Add IP Address**.
    *   To allow access from Render, choose **Allow Access From Anywhere** (`0.0.0.0/0`) or enter Render's specific outbound IP addresses.
4.  **Retrieve Connection URI:**
    *   Click **Database** in the sidebar. Click **Connect** on your active cluster.
    *   Choose **Drivers** under Connect to your application.
    *   Copy the connection string (e.g., `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`).
    *   Replace `<username>` and `<password>` placeholders with your database user credentials. Save this string for the backend configurations.

---

## 2. Backend API Setup: Render

1.  **Create Web Service:**
    *   Sign up at [Render](https://render.com) and link your GitHub repository.
    *   Click **New +** and select **Web Service**.
2.  **Configure Web Service settings:**
    *   **Name:** `collaborative-workspace-api`
    *   **Root Directory:** `server`
    *   **Runtime:** `Node`
    *   **Build Command:** `npm ci --only=production`
    *   **Start Command:** `node server.js`
3.  **Configure Environment Variables:**
    *   `PORT` = `5000` (Render binds this port automatically)
    *   `NODE_ENV` = `production`
    *   `MONGODB_URI` = `mongodb+srv://...` (your Atlas URI)
    *   `JWT_SECRET` = `a_very_strong_random_hash_key_for_signing_tokens`
    *   `GEMINI_API_KEY` = `your_google_gemini_api_key_from_ai_studio`
    *   `CLIENT_URL` = `https://your-app-client.vercel.app` (your Vercel app URL)
4.  **Save & Deploy:**
    *   Save variables. Render will automatically install packages, validate startup parameters, and launch the server.

---

## 3. Frontend Client Setup: Vercel

1.  **Create Project:**
    *   Sign up at [Vercel](https://vercel.com) and link your GitHub repository.
    *   Click **Add New...** and select **Project**.
    *   Import your repository.
2.  **Configure Project settings:**
    *   **Root Directory:** `client` (Select 'client' subdirectory!)
    *   **Framework Preset:** `Vite`
    *   **Build Command:** `npm run build`
    *   **Output Directory:** `dist`
3.  **Configure Build Environment Variables:**
    *   Add variable: `VITE_API_URL` = `https://collaborative-workspace-api.onrender.com/api` (pointing to your active Render web service API path!).
4.  **Save & Deploy:**
    *   Vercel compiles the assets and serves them via their global edge network.

---

## 4. Common Deployment Issues & Troubleshooting

### 1. CORS Mismatch / Blocking
*   **Symptom:** API requests fail with `CORS policy blocked access` or `Network Error`.
*   **Resolution:** Verify that `CLIENT_URL` in the Render environment variables matches the Vercel hosting domain *exactly*, including the protocol prefix (`https://`) and excluding any trailing slashes (`/`).

### 2. Sockets Upgrade Failures
*   **Symptom:** Real-time editing carets do not synchronize, and browser consoles print `WebSocket connection to wss://... failed`.
*   **Resolution:** Render Web Services support WebSockets natively on standard ports. Ensure that `VITE_API_URL` passed to Vercel uses the `https://` prefix (which `socket.io-client` parses to configure secure `wss://` automatically).

### 3. Session Login Failure (Cookies Rejected)
*   **Symptom:** Users log in successfully (200 status), but subsequent requests to `/me` return `401 Unauthorized` (no cookies sent).
*   **Resolution:** In production, HTTP cookies require secure configurations. Our platform sets `secure: true` automatically if `NODE_ENV === 'production'`. However, this requires the API server to be served over HTTPS. Ensure that your client and server communicate strictly over HTTPS.

### 4. Gemini AI SDK Connection Failures
*   **Symptom:** Slash commands return errors like `API_KEY not found` or `Model generation failure`.
*   **Resolution:** Make sure that the `GEMINI_API_KEY` is pasted correctly without quotes or spaces in Render's environment panel.
