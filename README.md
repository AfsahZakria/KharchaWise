# KharchaWise 💰

> *"Kharchay pe lagao tala, Savings se hoga ujala!"*
> Take control of your family finances — tailored for Pakistani households in Pakistani Rupees (PKR).

KharchaWise is a fullstack personal finance, expense tracking, monthly budgeting, and family savings planning application.

---

## ✨ Features

- **Smart Dashboard**: Real-time totals for Monthly Income, Living Expenses, Discretionary Net Balance, and Active Savings. Includes a 6-month historical trend chart.
- **Income & Expense Tracker**: Log corporate salary, freelancing earnings, grocery ration, K-Electric/LESCO bills, and transport costs. Includes real-time search, category filters, and CSV export.
- **Monthly Budget Engine**: Set an overall monthly ceiling alongside per-category caps with color-coded safety meters (`On Track`, `Approaching Limit`, `Over Budget`).
- **Savings Planner**: Set milestone targets for school fees, emergency medical reserves, and advance rent with automated calculations of **Daily**, **Weekly**, and **Monthly** savings quotas based on remaining days.
- **Settings & Disaster Recovery**: One-click JSON backup export and import, database status indicator, and complete data wipe.

---

## 📁 Project Structure

```
kharchawise/
├── backend/
│   ├── db.py               # SQLite data access layer & auto-seed engine
│   ├── server.py           # Native zero-dependency Python REST & SPA server
│   ├── fastapi_app.py      # Optional async FastAPI implementation with /docs
│   ├── requirements.txt    # Optional FastAPI dependencies
│   ├── server.js           # Optional Node.js / Express backend
│   └── package.json        # Optional Node.js dependencies
├── database/
│   ├── schema.sql          # Clean SQLite schema with foreign keys & indexes
│   └── kharchawise.db      # SQLite database file (auto-created on startup)
├── frontend/
│   ├── index.html          # Responsive single-page application shell
│   ├── css/
│   │   └── style.css       # Dark-mode design system with glow effects
│   └── js/
│       └── app.js          # Client-side reactive router, state, & chart logic
├── Dockerfile              # Production container build
├── docker-compose.yml      # 1-command container orchestration
├── start.bat               # Windows launcher script
├── start.sh                # Linux/macOS launcher script
├── DEPLOYMENT.md           # Step-by-step cloud deployment manual
└── README.md
```

---

## 🚀 Quick Start

```bash
# 1. Start fullstack server
python backend/server.py

# 2. Open in browser
http://localhost:8000
```
