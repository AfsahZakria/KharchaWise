-- KharchaWise SQLite Database Schema
-- Version 1.0.0

PRAGMA foreign_keys = ON;

-- 1. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    amount REAL NOT NULL CHECK(amount > 0),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- 2. Budgets Table
-- Stores overall limit (category = '__overall__') and per-category limits
CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category TEXT UNIQUE NOT NULL,
    limit_amount REAL NOT NULL CHECK(limit_amount >= 0),
    updated_at INTEGER NOT NULL
);

-- 3. Savings Goals Table
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    target REAL NOT NULL CHECK(target > 0),
    saved REAL NOT NULL DEFAULT 0,
    due_date TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- 4. Savings Contributions Table
CREATE TABLE IF NOT EXISTS contributions (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    date TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contributions_goal_id ON contributions(goal_id);

-- 5. Application Settings Table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
