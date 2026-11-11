/**
 * KharchaWise Node.js / Express Backend
 * Compatible with SQLite database.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'kharchawise.db');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

// Ensure database directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// Initialize schema if needed
const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', runtime: 'Node.js Express', database: 'SQLite (Connected)' });
});

// Full Data
app.get('/api/data', (req, res) => {
  try {
    const transactions = db.prepare('SELECT id, type, amount, category, description, date, created_at as createdAt FROM transactions ORDER BY date DESC, created_at DESC').all();
    const budgetRows = db.prepare('SELECT category, limit_amount FROM budgets').all();
    let overall = 0;
    const categories = {};
    for (const b of budgetRows) {
      if (b.category === '__overall__') overall = b.limit_amount;
      else categories[b.category] = b.limit_amount;
    }

    const goalRows = db.prepare('SELECT id, title, target, saved, due_date as dueDate, created_at as createdAt FROM goals ORDER BY created_at ASC').all();
    const goals = goalRows.map(g => {
      const contributions = db.prepare('SELECT id, amount, date, created_at as createdAt FROM contributions WHERE goal_id = ? ORDER BY created_at DESC').all(g.id);
      return { ...g, contributions };
    });

    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settings = { currency: 'PKR' };
    for (const s of settingsRows) settings[s.key] = s.value;

    res.json({ version: 1, transactions, budget: { overall, categories }, goals, settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Transaction
app.post('/api/transactions', (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;
    const id = req.body.id || crypto.randomUUID();
    const createdAt = Date.now();
    db.prepare('INSERT INTO transactions (id, type, amount, category, description, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, type, Number(amount), category, description, date, createdAt);
    res.status(201).json({ id, type, amount: Number(amount), category, description, date, createdAt });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Transaction
app.put('/api/transactions/:id', (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;
    db.prepare('UPDATE transactions SET type = ?, amount = ?, category = ?, description = ?, date = ? WHERE id = ?')
      .run(type, Number(amount), category, description, date, req.params.id);
    res.json({ id: req.params.id, ...req.body });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Transaction
app.delete('/api/transactions/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Set Overall Budget
app.post('/api/budget/overall', (req, res) => {
  try {
    const overall = Number(req.body.overall || req.body.amount || 0);
    const now = Date.now();
    db.prepare(`
      INSERT INTO budgets (id, category, limit_amount, updated_at) VALUES (?, '__overall__', ?, ?)
      ON CONFLICT(category) DO UPDATE SET limit_amount=excluded.limit_amount, updated_at=excluded.updated_at
    `).run(crypto.randomUUID(), overall, now);
    res.json({ overall });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Set Category Limit
app.post('/api/budget/category', (req, res) => {
  try {
    const { category } = req.body;
    const limit = Number(req.body.limit || req.body.amount || 0);
    const now = Date.now();
    if (limit > 0) {
      db.prepare(`
        INSERT INTO budgets (id, category, limit_amount, updated_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(category) DO UPDATE SET limit_amount=excluded.limit_amount, updated_at=excluded.updated_at
      `).run(crypto.randomUUID(), category, limit, now);
    } else {
      db.prepare('DELETE FROM budgets WHERE category = ?').run(category);
    }
    res.json({ category, limit });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add Goal
app.post('/api/goals', (req, res) => {
  try {
    const { title, target, dueDate } = req.body;
    const id = req.body.id || crypto.randomUUID();
    const saved = Number(req.body.saved || 0);
    const createdAt = Date.now();
    db.prepare('INSERT INTO goals (id, title, target, saved, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, title, Number(target), saved, dueDate, createdAt);
    res.status(201).json({ id, title, target: Number(target), saved, dueDate, contributions: [], createdAt });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Goal
app.put('/api/goals/:id', (req, res) => {
  try {
    const { title, target, dueDate } = req.body;
    db.prepare('UPDATE goals SET title = ?, target = ?, due_date = ? WHERE id = ?')
      .run(title, Number(target), dueDate, req.params.id);
    res.json({ id: req.params.id, ...req.body });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Goal
app.delete('/api/goals/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add Contribution
app.post('/api/goals/:id/contributions', (req, res) => {
  try {
    const amount = Number(req.body.amount || 0);
    const date = req.body.date || new Date().toISOString().split('T')[0];
    const cid = crypto.randomUUID();
    const now = Date.now();
    db.prepare('UPDATE goals SET saved = ROUND(saved + ?, 2) WHERE id = ?').run(amount, req.params.id);
    db.prepare('INSERT INTO contributions (id, goal_id, amount, date, created_at) VALUES (?, ?, ?, ?, ?)').run(cid, req.params.id, amount, date, now);
    res.json({ id: cid, goalId: req.params.id, amount, date });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Reset
app.post('/api/reset', (req, res) => {
  try {
    db.exec('DELETE FROM contributions; DELETE FROM goals; DELETE FROM budgets; DELETE FROM transactions;');
    res.json({ success: true, message: 'Database reset.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve Frontend
app.use(express.static(FRONTEND_DIR));
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`KharchaWise Node.js Server listening on port ${PORT}`);
});
