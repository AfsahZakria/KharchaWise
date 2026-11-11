# KharchaWise – Deployment & Operations Guide

KharchaWise is built with zero-lock-in architecture. It can be deployed as an all-in-one fullstack application, or decoupled into independent frontend and backend services.

---

## Architecture Summary

- **Frontend**: Responsive Single Page App (HTML5, CSS3, ES6+, Chart.js) with dark theme and PKR formatting.
- **Backend Options**:
  1. **Python 3 Native (Default)**: Zero external pip dependencies. Runs immediately on Python 3 with built-in `http.server` & `sqlite3`.
  2. **FastAPI (`backend/fastapi_app.py`)**: High-performance async Python backend with automated Swagger documentation at `/docs`.
  3. **Node.js Express (`backend/server.js`)**: Production-ready Express API with `better-sqlite3`.
- **Database**: SQLite (`database/kharchawise.db`) pre-populated with schema (`database/schema.sql`) and sample Pakistani household financial data.
- **Data Persistence**: When running with backend, data synchronizes to SQLite. When running offline or standalone frontend, it smoothly falls back to browser `localStorage`.

---

## 1. Quick Local Launch (Windows, macOS, Linux)

### Windows:
Double-click `start.bat` or run:
```cmd
cd kharchawise
python backend\server.py
```

### Linux / macOS:
```bash
cd kharchawise
chmod +x start.sh
./start.sh
```

Open your browser at **`http://localhost:8000`**.

---

## 2. Docker Deployment (Recommended for Cloud VPS)

You can spin up KharchaWise in any Linux/Docker environment with a single command:

```bash
docker compose up -d --build
```

- Accessible at: `http://your-server-ip:8000`
- Database is persisted in Docker volume `kharchawise_data`.

To check logs:
```bash
docker compose logs -f
```

---

## 3. Deploy to Render / Railway / Fly.io

### Option A: Render (Web Service)
1. Fork or upload this repository to GitHub.
2. In Render Dashboard, click **New +** -> **Web Service**.
3. Select your repository.
4. Set:
   - **Environment**: `Python 3`
   - **Build Command**: *(Leave empty or `echo "Ready"`)*
   - **Start Command**: `python backend/server.py`
   - **Environment Variables**:
     - `PORT`: `10000` (Render's default)
5. Click **Create Web Service**. Your app is live with SSL automatically!

### Option B: Railway (One-Click)
1. Push to GitHub and connect repository to Railway.
2. Railway automatically detects the `Dockerfile` and builds the production container.
3. Under **Settings**, add a persistent volume mount for `/app/database` to preserve SQLite data across deploys.

---

## 4. Deploy Frontend Separately to Vercel / Netlify

If you want to host the frontend on a CDN (Vercel, Netlify, Cloudflare Pages, GitHub Pages):

1. Unzip `kharchawise-frontend.zip`.
2. Deploy the `frontend/` directory to Vercel/Netlify.
3. By default, the frontend will operate in resilient offline mode using `localStorage`.
4. If you deployed the backend to Render/Railway (e.g., `https://kharchawise-api.onrender.com`), update `API_BASE` in `js/app.js`:
   ```javascript
   const API_BASE = 'https://kharchawise-api.onrender.com/api';
   ```

---

## 5. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Healthcheck & server diagnostic |
| `GET` | `/api/data` | Get all transactions, budget caps, goals, and settings |
| `POST` | `/api/transactions` | Create income or expense record |
| `PUT` | `/api/transactions/:id` | Update transaction record |
| `DELETE` | `/api/transactions/:id` | Delete transaction |
| `POST` | `/api/budget/overall` | Set overall monthly limit |
| `POST` | `/api/budget/category` | Set per-category monthly spending cap |
| `POST` | `/api/goals` | Create a new savings target |
| `PUT` | `/api/goals/:id` | Update savings target |
| `DELETE` | `/api/goals/:id` | Delete savings target |
| `POST` | `/api/goals/:id/contributions` | Record a deposit towards a savings target |
| `POST` | `/api/reset` | Clear all database tables |
| `POST` | `/api/restore` | Bulk restore database from JSON backup |
