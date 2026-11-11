"""
KharchaWise FastAPI Backend
Optional modern async Python backend with automated Swagger OpenAPI documentation (/docs).
Run with: uvicorn fastapi_app:app --host 0.0.0.0 --port 8000 --reload
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

import db

app = FastAPI(
    title="KharchaWise API",
    description="Full REST API for KharchaWise - Smart Family Finances in PKR",
    version="1.0.0"
)

# Enable CORS for cross-origin frontend hosting (e.g. Vercel frontend + Render backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    db.init_db(seed_if_empty=True)

# Pydantic Schemas
class TransactionModel(BaseModel):
    id: Optional[str] = None
    type: str
    amount: float
    category: str
    description: str
    date: str
    createdAt: Optional[int] = None

class OverallBudgetModel(BaseModel):
    overall: float

class CategoryLimitModel(BaseModel):
    category: str
    limit: float

class GoalModel(BaseModel):
    id: Optional[str] = None
    title: str
    target: float
    saved: Optional[float] = 0.0
    dueDate: str
    createdAt: Optional[int] = None

class ContributionModel(BaseModel):
    amount: float
    date: Optional[str] = None

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "app": "KharchaWise FastAPI",
        "database": "SQLite",
        "currency": "PKR"
    }

@app.get("/api/data")
def get_data():
    return db.fetch_all_data()

@app.post("/api/transactions", status_code=201)
def add_transaction(tx: TransactionModel):
    return db.add_transaction(tx.dict())

@app.put("/api/transactions/{tx_id}")
def update_transaction(tx_id: str, tx: TransactionModel):
    return db.update_transaction(tx_id, tx.dict())

@app.delete("/api/transactions/{tx_id}")
def delete_transaction(tx_id: str):
    return db.delete_transaction(tx_id)

@app.post("/api/budget/overall")
def set_overall(data: OverallBudgetModel):
    return db.set_overall_budget(data.overall)

@app.post("/api/budget/category")
def set_category(data: CategoryLimitModel):
    return db.set_category_limit(data.category, data.limit)

@app.post("/api/goals", status_code=201)
def add_goal(goal: GoalModel):
    return db.add_goal(goal.dict())

@app.put("/api/goals/{goal_id}")
def update_goal(goal_id: str, goal: GoalModel):
    return db.update_goal(goal_id, goal.dict())

@app.delete("/api/goals/{goal_id}")
def delete_goal(goal_id: str):
    return db.delete_goal(goal_id)

@app.post("/api/goals/{goal_id}/contributions")
def add_contribution(goal_id: str, data: ContributionModel):
    return db.add_contribution(goal_id, data.amount, data.date)

@app.post("/api/reset")
def reset_data():
    return db.reset_all_data()

@app.post("/api/restore")
def restore_data(payload: Dict[str, Any]):
    return db.restore_data(payload)

# Serve frontend static assets if available
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
