"""
KharchaWise Database Layer (SQLite)
Zero external dependencies - Uses Python's built-in sqlite3.
"""

import sqlite3
import os
import uuid
import time
from datetime import datetime, timedelta

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "..", "database", "kharchawise.db"))

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db(seed_if_empty=True):
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
    schema_path = os.path.join(os.path.dirname(__file__), "..", "database", "schema.sql")
    
    with get_db() as conn:
        with open(schema_path, "r", encoding="utf-8") as f:
            conn.executescript(f.read())
        
        # Check if database is empty
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM transactions")
        count = cur.fetchone()[0]
        if count == 0 and seed_if_empty:
            seed_data(conn)

def seed_data(conn):
    """Seed with realistic Pakistani family financial records in PKR."""
    now = datetime.now()
    cur_year = now.strftime("%Y")
    cur_month = now.strftime("%m")
    
    # Dates for current and recent months
    d_today = now.strftime("%Y-%m-%d")
    d_salary = f"{cur_year}-{cur_month}-01"
    d_groceries1 = f"{cur_year}-{cur_month}-03"
    d_groceries2 = f"{cur_year}-{cur_month}-08"
    d_electric = f"{cur_year}-{cur_month}-05"
    d_internet = f"{cur_year}-{cur_month}-06"
    d_freelance = f"{cur_year}-{cur_month}-07"
    d_transport = f"{cur_year}-{cur_month}-09"
    d_school = f"{cur_year}-{cur_month}-04"
    
    # 1. Transactions
    sample_txs = [
        ("income", 185000.0, "Salary", "Monthly Corporate Salary (Habib Bank)", d_salary),
        ("income", 45000.0, "Freelancing", "UI/UX & Web Development Client Project", d_freelance),
        ("expense", 24500.0, "Electricity", "K-Electric / LESCO Monthly Bill", d_electric),
        ("expense", 32000.0, "Groceries", "Monthly Ration & Imtiaz Super Market", d_groceries1),
        ("expense", 8500.0, "Groceries", "Fresh Meat & Vegetables", d_groceries2),
        ("expense", 4500.0, "Internet", "StormFiber 100Mbps Broadband", d_internet),
        ("expense", 14000.0, "Transport", "Car Fuel & Careem Commute", d_transport),
        ("expense", 22000.0, "Education", "Beaconhouse / Army Public School Fees", d_school),
        ("expense", 6500.0, "Healthcare", "Family Health Clinic & Pharmacy", d_today)
    ]
    
    now_ts = int(time.time() * 1000)
    for tx_type, amount, cat, desc, date_str in sample_txs:
        conn.execute(
            "INSERT INTO transactions (id, type, amount, category, description, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), tx_type, amount, cat, desc, date_str, now_ts)
        )
        now_ts += 1000
    
    # 2. Budgets
    conn.execute("INSERT OR REPLACE INTO budgets (id, category, limit_amount, updated_at) VALUES (?, ?, ?, ?)",
                 (str(uuid.uuid4()), "__overall__", 150000.0, now_ts))
    
    cat_limits = [
        ("Groceries", 45000.0),
        ("Electricity", 30000.0),
        ("Transport", 20000.0),
        ("Education", 25000.0),
        ("Internet", 6000.0),
        ("Healthcare", 15000.0)
    ]
    for cat, lim in cat_limits:
        conn.execute("INSERT OR REPLACE INTO budgets (id, category, limit_amount, updated_at) VALUES (?, ?, ?, ?)",
                     (str(uuid.uuid4()), cat, lim, now_ts))
    
    # 3. Savings Goals
    due1 = (now + timedelta(days=45)).strftime("%Y-%m-%d")
    due2 = (now + timedelta(days=150)).strftime("%Y-%m-%d")
    due3 = (now + timedelta(days=25)).strftime("%Y-%m-%d")
    
    g1_id = str(uuid.uuid4())
    g2_id = str(uuid.uuid4())
    g3_id = str(uuid.uuid4())
    
    conn.execute("INSERT INTO goals (id, title, target, saved, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                 (g1_id, "School & College Semester Fees", 120000.0, 75000.0, due1, now_ts))
    conn.execute("INSERT INTO goals (id, title, target, saved, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                 (g2_id, "Emergency Medical Reserve Fund", 250000.0, 180000.0, due2, now_ts))
    conn.execute("INSERT INTO goals (id, title, target, saved, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                 (g3_id, "House Rent Advance & Maintenance", 85000.0, 50000.0, due3, now_ts))
    
    # 4. Goal contributions
    conn.execute("INSERT INTO contributions (id, goal_id, amount, date, created_at) VALUES (?, ?, ?, ?, ?)",
                 (str(uuid.uuid4()), g1_id, 40000.0, d_salary, now_ts))
    conn.execute("INSERT INTO contributions (id, goal_id, amount, date, created_at) VALUES (?, ?, ?, ?, ?)",
                 (str(uuid.uuid4()), g1_id, 35000.0, d_freelance, now_ts))
    conn.execute("INSERT INTO contributions (id, goal_id, amount, date, created_at) VALUES (?, ?, ?, ?, ?)",
                 (str(uuid.uuid4()), g2_id, 180000.0, d_salary, now_ts))
    conn.execute("INSERT INTO contributions (id, goal_id, amount, date, created_at) VALUES (?, ?, ?, ?, ?)",
                 (str(uuid.uuid4()), g3_id, 50000.0, d_salary, now_ts))
    
    # 5. Settings
    conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ("currency", "PKR"))
    conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ("theme", "dark"))
    conn.commit()

def fetch_all_data():
    """Retrieve full synchronized state matching KharchaWise contract."""
    with get_db() as conn:
        cur = conn.cursor()
        
        # Transactions
        cur.execute("SELECT id, type, amount, category, description, date, created_at FROM transactions ORDER BY date DESC, created_at DESC")
        transactions = [dict(row) for row in cur.fetchall()]
        
        # Budget
        cur.execute("SELECT category, limit_amount FROM budgets")
        budget_rows = cur.fetchall()
        overall = 0.0
        categories = {}
        for r in budget_rows:
            if r["category"] == "__overall__":
                overall = float(r["limit_amount"])
            else:
                categories[r["category"]] = float(r["limit_amount"])
        
        # Goals with contributions
        cur.execute("SELECT id, title, target, saved, due_date, created_at FROM goals ORDER BY created_at ASC")
        goal_rows = cur.fetchall()
        goals = []
        for g in goal_rows:
            g_dict = dict(g)
            cur.execute("SELECT id, amount, date, created_at FROM contributions WHERE goal_id = ? ORDER BY created_at DESC", (g_dict["id"],))
            g_dict["contributions"] = [dict(c) for c in cur.fetchall()]
            goals.append(g_dict)
            
        # Settings
        cur.execute("SELECT key, value FROM settings")
        settings = {r["key"]: r["value"] for r in cur.fetchall()}
        if "currency" not in settings:
            settings["currency"] = "PKR"
            
        return {
            "version": 1,
            "transactions": transactions,
            "budget": {
                "overall": overall,
                "categories": categories
            },
            "goals": goals,
            "settings": settings
        }

def add_transaction(tx):
    tx_id = tx.get("id") or str(uuid.uuid4())
    created_at = tx.get("createdAt") or int(time.time() * 1000)
    with get_db() as conn:
        conn.execute(
            "INSERT INTO transactions (id, type, amount, category, description, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (tx_id, tx["type"], float(tx["amount"]), tx["category"], tx["description"], tx["date"], created_at)
        )
        conn.commit()
    return {"id": tx_id, "type": tx["type"], "amount": float(tx["amount"]), "category": tx["category"], "description": tx["description"], "date": tx["date"], "createdAt": created_at}

def update_transaction(tx_id, tx):
    with get_db() as conn:
        conn.execute(
            "UPDATE transactions SET type = ?, amount = ?, category = ?, description = ?, date = ? WHERE id = ?",
            (tx["type"], float(tx["amount"]), tx["category"], tx["description"], tx["date"], tx_id)
        )
        conn.commit()
    return {"id": tx_id, **tx}

def delete_transaction(tx_id):
    with get_db() as conn:
        conn.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))
        conn.commit()
    return {"success": True, "id": tx_id}

def set_overall_budget(amount):
    now_ts = int(time.time() * 1000)
    with get_db() as conn:
        conn.execute(
            "INSERT INTO budgets (id, category, limit_amount, updated_at) VALUES (?, '__overall__', ?, ?) "
            "ON CONFLICT(category) DO UPDATE SET limit_amount=excluded.limit_amount, updated_at=excluded.updated_at",
            (str(uuid.uuid4()), float(amount), now_ts)
        )
        conn.commit()
    return {"overall": float(amount)}

def set_category_limit(category, amount):
    now_ts = int(time.time() * 1000)
    with get_db() as conn:
        if amount > 0:
            conn.execute(
                "INSERT INTO budgets (id, category, limit_amount, updated_at) VALUES (?, ?, ?, ?) "
                "ON CONFLICT(category) DO UPDATE SET limit_amount=excluded.limit_amount, updated_at=excluded.updated_at",
                (str(uuid.uuid4()), category, float(amount), now_ts)
            )
        else:
            conn.execute("DELETE FROM budgets WHERE category = ?", (category,))
        conn.commit()
    return {"category": category, "limit": float(amount)}

def add_goal(goal):
    goal_id = goal.get("id") or str(uuid.uuid4())
    created_at = goal.get("createdAt") or int(time.time() * 1000)
    saved = float(goal.get("saved", 0))
    with get_db() as conn:
        conn.execute(
            "INSERT INTO goals (id, title, target, saved, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (goal_id, goal["title"], float(goal["target"]), saved, goal["dueDate"], created_at)
        )
        conn.commit()
    return {"id": goal_id, "title": goal["title"], "target": float(goal["target"]), "saved": saved, "dueDate": goal["dueDate"], "contributions": [], "createdAt": created_at}

def update_goal(goal_id, goal):
    with get_db() as conn:
        conn.execute(
            "UPDATE goals SET title = ?, target = ?, due_date = ? WHERE id = ?",
            (goal["title"], float(goal["target"]), goal["dueDate"], goal_id)
        )
        conn.commit()
    return {"id": goal_id, **goal}

def delete_goal(goal_id):
    with get_db() as conn:
        conn.execute("DELETE FROM goals WHERE id = ?", (goal_id,))
        conn.commit()
    return {"success": True, "id": goal_id}

def add_contribution(goal_id, amount, date_str=None):
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    now_ts = int(time.time() * 1000)
    c_id = str(uuid.uuid4())
    with get_db() as conn:
        conn.execute(
            "UPDATE goals SET saved = ROUND(saved + ?, 2) WHERE id = ?",
            (float(amount), goal_id)
        )
        conn.execute(
            "INSERT INTO contributions (id, goal_id, amount, date, created_at) VALUES (?, ?, ?, ?, ?)",
            (c_id, goal_id, float(amount), date_str, now_ts)
        )
        conn.commit()
    return {"id": c_id, "goalId": goal_id, "amount": float(amount), "date": date_str}

def reset_all_data():
    with get_db() as conn:
        conn.execute("DELETE FROM contributions;")
        conn.execute("DELETE FROM goals;")
        conn.execute("DELETE FROM budgets;")
        conn.execute("DELETE FROM transactions;")
        conn.commit()
    return {"success": True, "message": "All database data wiped."}

def restore_data(data):
    """Restore from JSON backup."""
    with get_db() as conn:
        # Wipe first
        conn.execute("DELETE FROM contributions;")
        conn.execute("DELETE FROM goals;")
        conn.execute("DELETE FROM budgets;")
        conn.execute("DELETE FROM transactions;")
        
        now_ts = int(time.time() * 1000)
        # Restore transactions
        for tx in data.get("transactions", []):
            conn.execute(
                "INSERT INTO transactions (id, type, amount, category, description, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (tx.get("id", str(uuid.uuid4())), tx["type"], float(tx["amount"]), tx["category"], tx["description"], tx["date"], tx.get("createdAt", now_ts))
            )
            
        # Restore budget
        budget = data.get("budget", {})
        if "overall" in budget:
            conn.execute("INSERT OR REPLACE INTO budgets (id, category, limit_amount, updated_at) VALUES (?, '__overall__', ?, ?)",
                         (str(uuid.uuid4()), float(budget["overall"]), now_ts))
        for cat, lim in budget.get("categories", {}).items():
            conn.execute("INSERT OR REPLACE INTO budgets (id, category, limit_amount, updated_at) VALUES (?, ?, ?, ?)",
                         (str(uuid.uuid4()), cat, float(lim), now_ts))
            
        # Restore goals
        for g in data.get("goals", []):
            g_id = g.get("id", str(uuid.uuid4()))
            conn.execute("INSERT INTO goals (id, title, target, saved, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                         (g_id, g["title"], float(g["target"]), float(g.get("saved", 0)), g.get("dueDate", g.get("due_date", "")), g.get("createdAt", now_ts)))
            for c in g.get("contributions", []):
                conn.execute("INSERT INTO contributions (id, goal_id, amount, date, created_at) VALUES (?, ?, ?, ?, ?)",
                             (c.get("id", str(uuid.uuid4())), g_id, float(c["amount"]), c["date"], c.get("createdAt", now_ts)))
                
        conn.commit()
    return {"success": True, "message": "Data restored successfully"}
