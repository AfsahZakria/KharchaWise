/**
 * KharchaWise - Frontend Client Application
 * Handles State, Reactive UI Rendering, Routing, Calculations, Charts & Database Sync
 */

// Configuration & Default Data
const STORAGE_KEY = 'kharchawise:data:v1';
const API_BASE = '/api';

const INCOME_CATEGORIES = ['Salary', 'Business', 'Freelancing', 'Other Income'];
const EXPENSE_CATEGORIES = [
    'Groceries', 'Electricity', 'Gas', 'Water', 'Rent', 
    'Education', 'Transport', 'Healthcare', 'Shopping', 'Internet', 'Other Expenses'
];
const GOAL_PRESETS = [
    'School fees', 'University fees', 'Emergency fund', 
    'Medical expenses', 'Rent', 'Other future expenses'
];

// App State
let state = {
    version: 1,
    transactions: [],
    budget: {
        overall: 150000,
        categories: {}
    },
    goals: [],
    settings: {
        currency: 'PKR',
        theme: 'dark'
    }
};

let isConnectedToBackend = false;
let editingTransactionId = null;
let editingGoalId = null;
let contributingGoalId = null;
let confirmCallback = null;
let trendChartInstance = null;
let categoryChartInstance = null;

// Helpers: Formatting & Dates
function formatPKR(amount, includeSign = false, type = null) {
    const num = Math.abs(Number(amount) || 0);
    const formatted = 'Rs. ' + num.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (!includeSign) return formatted;
    if (type === 'income') return '+' + formatted;
    if (type === 'expense') return '-' + formatted;
    return (amount < 0 ? '-' : '+') + formatted;
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const date = new Date(parts[0], parts[1] - 1, parts[2]);
            return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        return dateStr;
    } catch (e) {
        return dateStr;
    }
}

function getTodayString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getCurrentMonthString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

function getDaysRemaining(dueDateStr) {
    if (!dueDateStr) return 0;
    const parts = dueDateStr.split('-');
    const due = new Date(parts[0], parts[1] - 1, parts[2]);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Toast Notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '✓';
    if (type === 'danger') icon = '✕';
    if (type === 'info') icon = 'ℹ';
    
    toast.innerHTML = `<span style="font-weight: 800;">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(12px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// Seed Initial Data (Used for Offline fallback if localStorage is clean)
function getDefaultData() {
    const today = getTodayString();
    const curMonth = getCurrentMonthString();

    const d1 = `${curMonth}-01`;
    const d2 = `${curMonth}-03`;
    const d3 = `${curMonth}-05`;
    const d4 = `${curMonth}-06`;
    const d5 = `${curMonth}-07`;
    const d6 = `${curMonth}-08`;

    return {
        version: 1,
        transactions: [
            { id: 'tx-1', type: 'income', amount: 185000, category: 'Salary', description: 'Monthly Corporate Salary (Habib Bank)', date: d1, createdAt: Date.now() - 50000 },
            { id: 'tx-2', type: 'income', amount: 45000, category: 'Freelancing', description: 'Client Mobile App & Web Design Project', date: d5, createdAt: Date.now() - 40000 },
            { id: 'tx-3', type: 'expense', amount: 24500, category: 'Electricity', description: 'K-Electric / LESCO Monthly Bill', date: d3, createdAt: Date.now() - 30000 },
            { id: 'tx-4', type: 'expense', amount: 32000, category: 'Groceries', description: 'Monthly Family Ration & Imtiaz Super Market', date: d2, createdAt: Date.now() - 25000 },
            { id: 'tx-5', type: 'expense', amount: 8500, category: 'Groceries', description: 'Fresh Fruits, Vegetables & Meat', date: d6, createdAt: Date.now() - 20000 },
            { id: 'tx-6', type: 'expense', amount: 4500, category: 'Internet', description: 'StormFiber 100Mbps Broadband', date: d4, createdAt: Date.now() - 15000 },
            { id: 'tx-7', type: 'expense', amount: 14000, category: 'Transport', description: 'Petrol & Monthly Commute', date: d5, createdAt: Date.now() - 10000 },
            { id: 'tx-8', type: 'expense', amount: 22000, category: 'Education', description: 'Beaconhouse / Army Public School Fees', date: d2, createdAt: Date.now() - 8000 },
            { id: 'tx-9', type: 'expense', amount: 6500, category: 'Healthcare', description: 'Family Pharmacy & Medical Consultation', date: today, createdAt: Date.now() - 5000 }
        ],
        budget: {
            overall: 150000,
            categories: {
                'Groceries': 45000,
                'Electricity': 30000,
                'Transport': 20000,
                'Education': 25000,
                'Internet': 6000,
                'Healthcare': 15000
            }
        },
        goals: [
            {
                id: 'goal-1',
                title: 'School & College Semester Fees',
                target: 120000,
                saved: 75000,
                dueDate: calculateFutureDate(45),
                contributions: [
                    { id: 'c-1', amount: 40000, date: d1 },
                    { id: 'c-2', amount: 35000, date: d5 }
                ],
                createdAt: Date.now() - 100000
            },
            {
                id: 'goal-2',
                title: 'Emergency Medical Reserve Fund',
                target: 250000,
                saved: 180000,
                dueDate: calculateFutureDate(150),
                contributions: [
                    { id: 'c-3', amount: 180000, date: d1 }
                ],
                createdAt: Date.now() - 90000
            },
            {
                id: 'goal-3',
                title: 'House Rent Advance & Maintenance',
                target: 85000,
                saved: 50000,
                dueDate: calculateFutureDate(25),
                contributions: [
                    { id: 'c-4', amount: 50000, date: d1 }
                ],
                createdAt: Date.now() - 80000
            }
        ],
        settings: {
            currency: 'PKR',
            theme: 'dark'
        }
    };
}

function calculateFutureDate(daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Data Synchronization (API with LocalStorage fallback)
async function loadData() {
    try {
        const res = await fetch(`${API_BASE}/data`, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            state = data;
            isConnectedToBackend = true;
            updateConnectionBadge(true);
            saveToLocalStorage(); // cache locally
            renderCurrentView();
            return;
        }
    } catch (e) {
        console.log('Backend API unreachable, using local storage mode:', e.message);
    }

    // Fallback: LocalStorage
    isConnectedToBackend = false;
    updateConnectionBadge(false);
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
        try {
            state = JSON.parse(local);
        } catch (e) {
            state = getDefaultData();
        }
    } else {
        state = getDefaultData();
        saveToLocalStorage();
    }
    renderCurrentView();
}

function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function updateConnectionBadge(connected) {
    const badge = document.getElementById('apiStatusBadge');
    if (!badge) return;
    if (connected) {
        badge.className = 'status-safe';
        badge.innerHTML = '● Live SQLite Database';
    } else {
        badge.className = 'status-warning';
        badge.innerHTML = '● Offline / Local Storage';
    }
}

// Router & Navigation
function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'home';
    const cleanRoute = hash.split('?')[0];

    // Hide all views
    document.querySelectorAll('.page-view').forEach(view => view.classList.remove('active'));

    // Highlight active nav item
    document.querySelectorAll('.nav-item a, .mobile-drawer a').forEach(a => {
        const target = a.getAttribute('href').replace('#', '');
        if (target === cleanRoute) {
            a.classList.add('active');
        } else {
            a.classList.remove('active');
        }
    });

    // Close mobile drawer
    const drawer = document.getElementById('mobileDrawer');
    if (drawer) drawer.style.display = 'none';

    // Show target view
    const targetView = document.getElementById(`view-${cleanRoute}`) || document.getElementById('view-home');
    if (targetView) {
        targetView.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        renderCurrentView(cleanRoute);
    }
}

// Render Engine
function renderCurrentView(route = null) {
    if (!route) {
        route = window.location.hash.replace('#', '') || 'home';
        route = route.split('?')[0];
    }

    if (route === 'dashboard') {
        renderDashboard();
    } else if (route === 'transactions') {
        renderTransactions();
    } else if (route === 'budget') {
        renderBudget();
    } else if (route === 'savings') {
        renderSavings();
    } else if (route === 'settings') {
        renderSettings();
    }
}

// --------------------------------------------------------------------------
// 1. DASHBOARD VIEW
// --------------------------------------------------------------------------
function renderDashboard() {
    const curMonth = getCurrentMonthString();
    let totalIncome = 0;
    let totalExpenses = 0;

    state.transactions.forEach(tx => {
        if (tx.date.startsWith(curMonth)) {
            if (tx.type === 'income') totalIncome += Number(tx.amount);
            else if (tx.type === 'expense') totalExpenses += Number(tx.amount);
        }
    });

    const balance = totalIncome - totalExpenses;
    const totalSaved = state.goals.reduce((acc, g) => acc + (Number(g.saved) || 0), 0);

    // Update Metric Cards
    document.getElementById('dashTotalIncome').textContent = formatPKR(totalIncome, true, 'income');
    document.getElementById('dashTotalExpense').textContent = formatPKR(totalExpenses, true, 'expense');
    document.getElementById('dashNetBalance').textContent = formatPKR(balance);
    document.getElementById('dashTotalSavings').textContent = formatPKR(totalSaved);

    // Dashboard Budget Overview Progress
    const overallLimit = Number(state.budget.overall) || 0;
    const budgetPct = overallLimit > 0 ? Math.min(Math.round((totalExpenses / overallLimit) * 100), 100) : 0;
    const dashBudgetBar = document.getElementById('dashBudgetBar');
    if (dashBudgetBar) {
        dashBudgetBar.style.width = `${budgetPct}%`;
        if (totalExpenses > overallLimit) {
            dashBudgetBar.className = 'progress-bar-fill fill-danger';
        } else if (budgetPct >= 80) {
            dashBudgetBar.className = 'progress-bar-fill fill-warning';
        } else {
            dashBudgetBar.className = 'progress-bar-fill fill-primary';
        }
    }
    const dashBudgetSpent = document.getElementById('dashBudgetSpent');
    if (dashBudgetSpent) dashBudgetSpent.textContent = `${formatPKR(totalExpenses)} spent of ${formatPKR(overallLimit)}`;

    // Render Recent Transactions (Top 5)
    const recentTxList = document.getElementById('dashRecentTxList');
    if (recentTxList) {
        const sorted = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        if (sorted.length === 0) {
            recentTxList.innerHTML = `<li style="padding: 24px; text-align: center; color: var(--text-muted);">No transactions recorded yet. Click "+ Add Income" or "+ Add Expense" above!</li>`;
        } else {
            recentTxList.innerHTML = sorted.map(tx => renderTransactionItemHTML(tx, false)).join('');
        }
    }

    // Render Top Category Spend Progress
    renderTopCategoriesSummary(curMonth);

    // Render Charts
    renderTrendChart();
}

function renderTopCategoriesSummary(month) {
    const container = document.getElementById('dashTopCategories');
    if (!container) return;

    const catSums = {};
    state.transactions.forEach(tx => {
        if (tx.type === 'expense' && tx.date.startsWith(month)) {
            catSums[tx.category] = (catSums[tx.category] || 0) + Number(tx.amount);
        }
    });

    const entries = Object.entries(catSums).sort((a, b) => b[1] - a[1]).slice(0, 4);
    if (entries.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; padding: 10px 0;">No expenses recorded this month.</p>`;
        return;
    }

    const totalExpense = entries.reduce((acc, curr) => acc + curr[1], 0) || 1;
    container.innerHTML = entries.map(([cat, amt]) => {
        const pct = Math.round((amt / totalExpense) * 100);
        return `
            <div class="category-item">
                <div class="category-meta">
                    <span class="category-name">${cat}</span>
                    <span class="category-amt">${formatPKR(amt)} (${pct}%)</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill fill-primary" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// --------------------------------------------------------------------------
// 2. TRANSACTIONS VIEW
// --------------------------------------------------------------------------
function renderTransactions() {
    populateCategoryDropdowns();
    const typeFilter = document.querySelector('.pill-btn.active')?.dataset.type || 'all';
    const catFilter = document.getElementById('txCategoryFilter')?.value || 'all';
    const searchQuery = (document.getElementById('txSearchInput')?.value || '').toLowerCase().trim();
    const monthFilter = document.getElementById('txMonthFilter')?.value || '';

    let filtered = [...state.transactions];

    if (typeFilter !== 'all') {
        filtered = filtered.filter(tx => tx.type === typeFilter);
    }

    if (catFilter !== 'all') {
        filtered = filtered.filter(tx => tx.category === catFilter);
    }

    if (monthFilter) {
        filtered = filtered.filter(tx => tx.date.startsWith(monthFilter));
    }

    if (searchQuery) {
        filtered = filtered.filter(tx => 
            tx.description.toLowerCase().includes(searchQuery) ||
            tx.category.toLowerCase().includes(searchQuery)
        );
    }

    // Sort descending by date
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Summary calculation for filtered subset
    let income = 0;
    let expense = 0;
    filtered.forEach(tx => {
        if (tx.type === 'income') income += Number(tx.amount);
        if (tx.type === 'expense') expense += Number(tx.amount);
    });

    const countEl = document.getElementById('txCountBadge');
    if (countEl) countEl.textContent = `${filtered.length} records`;

    const summaryEl = document.getElementById('txFilteredSummary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <span class="status-safe" style="padding: 4px 10px; border-radius: var(--radius-full); font-size: 0.82rem; font-weight: 700;">+ ${formatPKR(income)}</span>
            <span class="status-over" style="padding: 4px 10px; border-radius: var(--radius-full); font-size: 0.82rem; font-weight: 700;">- ${formatPKR(expense)}</span>
            <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">Net: ${formatPKR(income - expense)}</span>
        `;
    }

    const listEl = document.getElementById('fullTxList');
    if (!listEl) return;

    if (filtered.length === 0) {
        listEl.innerHTML = `<li style="padding: 40px; text-align: center; color: var(--text-muted);">No matching transactions found. Try adjusting your filters.</li>`;
        return;
    }

    listEl.innerHTML = filtered.map(tx => renderTransactionItemHTML(tx, true)).join('');
}

function renderTransactionItemHTML(tx, showActions = true) {
    const isIncome = tx.type === 'income';
    const icon = isIncome ? '↗' : '↘';
    const iconClass = isIncome ? 'bg-income text-income' : 'bg-expense text-expense';
    const amountColor = isIncome ? 'text-income' : 'text-expense';

    return `
        <li class="tx-item" id="tx-row-${tx.id}">
            <div class="tx-left">
                <span class="tx-icon ${iconClass}" style="font-weight: 800; font-size: 1.1rem;">${icon}</span>
                <div class="tx-info">
                    <p class="tx-desc">${escapeHTML(tx.description)}</p>
                    <div class="tx-meta">
                        <span class="tx-badge">${escapeHTML(tx.category)}</span>
                        <span>•</span>
                        <span>${formatDateDisplay(tx.date)}</span>
                    </div>
                </div>
            </div>
            <div class="tx-right">
                <span class="tx-amount ${amountColor}">${formatPKR(tx.amount, true, tx.type)}</span>
                ${showActions ? `
                    <div class="tx-actions">
                        <button class="btn btn-secondary btn-icon" onclick="openEditTransactionModal('${tx.id}')" title="Edit">✎</button>
                        <button class="btn btn-secondary btn-icon" style="color: var(--danger);" onclick="confirmDeleteTransaction('${tx.id}')" title="Delete">✕</button>
                    </div>
                ` : ''}
            </div>
        </li>
    `;
}

// --------------------------------------------------------------------------
// 3. MONTHLY BUDGET VIEW
// --------------------------------------------------------------------------
function renderBudget() {
    const curMonth = getCurrentMonthString();
    const overallLimit = Number(state.budget.overall) || 0;

    let totalSpent = 0;
    const catSpent = {};

    state.transactions.forEach(tx => {
        if (tx.type === 'expense' && tx.date.startsWith(curMonth)) {
            const amt = Number(tx.amount) || 0;
            totalSpent += amt;
            catSpent[tx.category] = (catSpent[tx.category] || 0) + amt;
        }
    });

    const remaining = overallLimit - totalSpent;
    const overallPct = overallLimit > 0 ? (totalSpent / overallLimit) * 100 : 0;

    document.getElementById('budgetOverallLimit').textContent = formatPKR(overallLimit);
    document.getElementById('budgetTotalSpent').textContent = formatPKR(totalSpent);
    document.getElementById('budgetRemaining').textContent = `${remaining >= 0 ? '' : '-'}${formatPKR(Math.abs(remaining))}`;

    const statusPill = document.getElementById('budgetOverallStatus');
    const fillBar = document.getElementById('budgetOverallBar');
    if (totalSpent > overallLimit) {
        statusPill.className = 'budget-status-pill status-over';
        statusPill.textContent = 'Over Budget';
        fillBar.className = 'progress-bar-fill fill-danger';
    } else if (overallPct >= 80) {
        statusPill.className = 'budget-status-pill status-warning';
        statusPill.textContent = 'Approaching Limit';
        fillBar.className = 'progress-bar-fill fill-warning';
    } else {
        statusPill.className = 'budget-status-pill status-safe';
        statusPill.textContent = 'On Track';
        fillBar.className = 'progress-bar-fill fill-primary';
    }
    fillBar.style.width = `${Math.min(overallPct, 100)}%`;

    // Render Category Limits Grid
    const grid = document.getElementById('categoryBudgetGrid');
    if (!grid) return;

    grid.innerHTML = EXPENSE_CATEGORIES.map(category => {
        const limit = Number(state.budget.categories[category]) || 0;
        const spent = catSpent[category] || 0;
        const pct = limit > 0 ? (spent / limit) * 100 : 0;
        const catRem = limit - spent;

        let badgeClass = 'status-safe';
        let badgeText = 'Safe';
        let barClass = 'fill-primary';

        if (limit === 0) {
            badgeClass = '';
            badgeText = 'No Limit Set';
        } else if (spent > limit) {
            badgeClass = 'status-over';
            badgeText = 'Exceeded';
            barClass = 'fill-danger';
        } else if (pct >= 80) {
            badgeClass = 'status-warning';
            badgeText = 'Warning (80%+)';
            barClass = 'fill-warning';
        }

        return `
            <div class="category-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <h4 style="font-family: var(--font-display); font-size: 1.1rem; font-weight: 700;">${category}</h4>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">${formatPKR(spent)} spent</span>
                    </div>
                    ${limit > 0 ? `<span class="budget-status-pill ${badgeClass}">${badgeText}</span>` : ''}
                </div>
                
                <div class="progress-bar-bg" style="margin-bottom: 12px;">
                    <div class="progress-bar-fill ${barClass}" style="width: ${Math.min(pct, 100)}%"></div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
                    <span>Limit: <strong style="color: var(--text-primary);">${limit > 0 ? formatPKR(limit) : 'None'}</strong></span>
                    <span>Remaining: <strong style="color: ${catRem < 0 ? 'var(--danger)' : 'var(--text-primary)'};">${limit > 0 ? formatPKR(catRem) : 'N/A'}</strong></span>
                </div>

                <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="openCategoryLimitModal('${category}', ${limit})">
                    ${limit > 0 ? 'Adjust Limit' : 'Set Category Limit'}
                </button>
            </div>
        `;
    }).join('');
}

// --------------------------------------------------------------------------
// 4. SAVINGS PLANNER VIEW
// --------------------------------------------------------------------------
function renderSavings() {
    let totalTarget = 0;
    let totalSaved = 0;

    state.goals.forEach(g => {
        totalTarget += Number(g.target) || 0;
        totalSaved += Number(g.saved) || 0;
    });

    const totalPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
    document.getElementById('savingsTotalTarget').textContent = formatPKR(totalTarget);
    document.getElementById('savingsTotalSaved').textContent = formatPKR(totalSaved);
    document.getElementById('savingsOverallPct').textContent = `${totalPct}%`;
    document.getElementById('savingsTotalBar').style.width = `${Math.min(totalPct, 100)}%`;

    const grid = document.getElementById('goalsGrid');
    if (!grid) return;

    if (state.goals.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; padding: 48px; text-align: center; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-xl); color: var(--text-muted);">
            <h3>No savings goals yet</h3>
            <p style="margin-top: 8px;">Create a plan for school fees, emergency fund, or advance rent.</p>
            <button class="btn btn-primary" style="margin-top: 16px;" onclick="openNewGoalModal()">+ Create Your First Goal</button>
        </div>`;
        return;
    }

    grid.innerHTML = state.goals.map(goal => {
        const target = Number(goal.target) || 0;
        const saved = Number(goal.saved) || 0;
        const remaining = Math.max(0, target - saved);
        const progress = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
        const daysLeft = getDaysRemaining(goal.dueDate);

        let statusText = `${daysLeft} days remaining`;
        let statusBadge = 'status-safe';
        if (remaining === 0) {
            statusText = 'Goal Completed! 🎉';
            statusBadge = 'status-safe';
        } else if (daysLeft < 0) {
            statusText = 'Target Overdue';
            statusBadge = 'status-over';
        } else if (daysLeft <= 14) {
            statusBadge = 'status-warning';
        }

        // Target breakdowns
        let daily = remaining;
        let weekly = remaining;
        let monthly = remaining;
        if (daysLeft > 0) {
            daily = Math.ceil(remaining / daysLeft);
            weekly = daysLeft <= 7 ? remaining : Math.ceil((remaining * 7) / daysLeft);
            monthly = daysLeft <= 30 ? remaining : Math.ceil((remaining * 30) / daysLeft);
        }

        return `
            <div class="goal-card" id="goal-card-${goal.id}">
                <div>
                    <div class="goal-card-header">
                        <div>
                            <h3 class="goal-title">${escapeHTML(goal.title)}</h3>
                            <p class="goal-due">Due: ${formatDateDisplay(goal.dueDate)}</p>
                        </div>
                        <span class="budget-status-pill ${statusBadge}">${statusText}</span>
                    </div>

                    <div class="goal-amounts">
                        <span class="goal-saved">${formatPKR(saved)}</span>
                        <span class="goal-target">/ ${formatPKR(target)}</span>
                        <span style="margin-left: auto; font-weight: 700; color: var(--primary);">${progress}%</span>
                    </div>

                    <div class="progress-bar-bg" style="margin-bottom: 12px;">
                        <div class="progress-bar-fill fill-primary" style="width: ${progress}%"></div>
                    </div>

                    ${remaining > 0 ? `
                        <div class="target-breakdown-box">
                            <div>
                                <span class="target-item-title">Daily</span>
                                <p class="target-item-val">${formatPKR(daily)}</p>
                            </div>
                            <div>
                                <span class="target-item-title">Weekly</span>
                                <p class="target-item-val">${formatPKR(weekly)}</p>
                            </div>
                            <div>
                                <span class="target-item-title">Monthly</span>
                                <p class="target-item-val">${formatPKR(monthly)}</p>
                            </div>
                        </div>
                    ` : `
                        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid var(--primary); border-radius: var(--radius-md); padding: 12px; text-align: center; margin: 16px 0; color: var(--primary); font-weight: 700;">
                            ✨ Target Achieved! Fantastic financial discipline.
                        </div>
                    `}
                </div>

                <div class="goal-card-actions">
                    <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="openAddContributionModal('${goal.id}', '${escapeHTML(goal.title)}')">
                        + Add Contribution
                    </button>
                    <button class="btn btn-secondary btn-icon" onclick="openEditGoalModal('${goal.id}')" title="Edit Goal">✎</button>
                    <button class="btn btn-secondary btn-icon" style="color: var(--danger);" onclick="confirmDeleteGoal('${goal.id}')" title="Delete Goal">✕</button>
                </div>
            </div>
        `;
    }).join('');
}

// --------------------------------------------------------------------------
// 5. SETTINGS VIEW
// --------------------------------------------------------------------------
function renderSettings() {
    updateConnectionBadge(isConnectedToBackend);
    document.getElementById('settingsCurrency').textContent = 'PKR (Pakistani Rupee - Rs.)';
}

// --------------------------------------------------------------------------
// CHARTS (Chart.js or Pure Canvas fallback)
// --------------------------------------------------------------------------
function renderTrendChart() {
    const canvas = document.getElementById('dashTrendChart');
    if (!canvas) return;

    // Generate last 6 months data
    const labels = [];
    const incomeData = [];
    const expenseData = [];

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${y}-${m}`;
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
        labels.push(monthLabel);

        let inc = 0;
        let exp = 0;
        state.transactions.forEach(tx => {
            if (tx.date.startsWith(key)) {
                if (tx.type === 'income') inc += Number(tx.amount);
                if (tx.type === 'expense') exp += Number(tx.amount);
            }
        });
        incomeData.push(inc);
        expenseData.push(exp);
    }

    if (window.Chart) {
        if (trendChartInstance) trendChartInstance.destroy();

        trendChartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        backgroundColor: '#10b981',
                        borderRadius: 6,
                        barPercentage: 0.6
                    },
                    {
                        label: 'Expense',
                        data: expenseData,
                        backgroundColor: '#ef4444',
                        borderRadius: 6,
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#94a3b8', font: { family: 'Manrope', weight: 600 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label}: Rs. ${context.raw.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        grid: { color: '#1e2230' },
                        ticks: {
                            color: '#94a3b8',
                            callback: function(val) {
                                return 'Rs. ' + (val >= 1000 ? (val / 1000) + 'k' : val);
                            }
                        }
                    }
                }
            }
        });
    }
}

// --------------------------------------------------------------------------
// MODAL & ACTION HANDLERS
// --------------------------------------------------------------------------
function populateCategoryDropdowns() {
    const sel = document.getElementById('txCategorySelect');
    const filterSel = document.getElementById('txCategoryFilter');
    const activeType = document.querySelector('#modalTransaction input[name="txType"]:checked')?.value || 'expense';
    const categories = activeType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    if (sel) {
        sel.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    if (filterSel && filterSel.options.length <= 1) {
        const allCats = [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])];
        filterSel.innerHTML = `<option value="all">All Categories</option>` + allCats.map(c => `<option value="${c}">${c}</option>`).join('');
    }
}

function openAddTransactionModal(defaultType = 'expense') {
    editingTransactionId = null;
    document.getElementById('modalTxTitle').textContent = defaultType === 'income' ? 'Add Income' : 'Add Expense';
    
    // Set type toggle
    setTransactionModalType(defaultType);
    
    document.getElementById('txAmountInput').value = '';
    document.getElementById('txDescInput').value = '';
    document.getElementById('txDateInput').value = getTodayString();
    
    populateCategoryDropdowns();
    document.getElementById('modalTransaction').classList.add('active');
}

function openEditTransactionModal(id) {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;

    editingTransactionId = id;
    document.getElementById('modalTxTitle').textContent = 'Edit Transaction';
    setTransactionModalType(tx.type);

    document.getElementById('txAmountInput').value = tx.amount;
    document.getElementById('txDescInput').value = tx.description;
    document.getElementById('txDateInput').value = tx.date;
    
    populateCategoryDropdowns();
    document.getElementById('txCategorySelect').value = tx.category;

    document.getElementById('modalTransaction').classList.add('active');
}

function setTransactionModalType(type) {
    const incomeBtn = document.getElementById('typeBtnIncome');
    const expenseBtn = document.getElementById('typeBtnExpense');
    
    if (type === 'income') {
        incomeBtn.className = 'type-toggle-btn active-income';
        expenseBtn.className = 'type-toggle-btn';
    } else {
        incomeBtn.className = 'type-toggle-btn';
        expenseBtn.className = 'type-toggle-btn active-expense';
    }
    populateCategoryDropdowns();
}

async function handleSaveTransaction(e) {
    e.preventDefault();
    const isIncome = document.getElementById('typeBtnIncome').classList.contains('active-income');
    const type = isIncome ? 'income' : 'expense';
    const amount = parseFloat(document.getElementById('txAmountInput').value);
    const category = document.getElementById('txCategorySelect').value;
    const description = document.getElementById('txDescInput').value.trim();
    const date = document.getElementById('txDateInput').value;

    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount greater than 0.', 'danger');
        return;
    }
    if (!description) {
        showToast('Please provide a description.', 'danger');
        return;
    }

    const payload = {
        type,
        amount,
        category,
        description,
        date
    };

    if (editingTransactionId) {
        // Update
        if (isConnectedToBackend) {
            try {
                await fetch(`${API_BASE}/transactions/${editingTransactionId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch (err) {
                console.error(err);
            }
        }
        const idx = state.transactions.findIndex(t => t.id === editingTransactionId);
        if (idx !== -1) {
            state.transactions[idx] = { ...state.transactions[idx], ...payload };
        }
        showToast('Transaction updated successfully.');
    } else {
        // Add
        const newId = 'tx-' + Date.now();
        payload.id = newId;
        payload.createdAt = Date.now();

        if (isConnectedToBackend) {
            try {
                const res = await fetch(`${API_BASE}/transactions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    const saved = await res.json();
                    payload.id = saved.id;
                }
            } catch (err) {
                console.error(err);
            }
        }
        state.transactions.unshift(payload);
        showToast(`${type === 'income' ? 'Income' : 'Expense'} of ${formatPKR(amount)} logged!`);
    }

    saveToLocalStorage();
    closeModals();
    renderCurrentView();
}

function confirmDeleteTransaction(id) {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;

    openConfirmModal(
        'Delete Transaction',
        `Are you sure you want to delete "${tx.description}" (${formatPKR(tx.amount)})?`,
        async () => {
            if (isConnectedToBackend) {
                try {
                    await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' });
                } catch (e) {
                    console.error(e);
                }
            }
            state.transactions = state.transactions.filter(t => t.id !== id);
            saveToLocalStorage();
            showToast('Transaction removed.');
            renderCurrentView();
        }
    );
}

// Goals
function openNewGoalModal() {
    editingGoalId = null;
    document.getElementById('modalGoalTitle').textContent = 'Create New Savings Goal';
    document.getElementById('goalNameInput').value = '';
    document.getElementById('goalTargetInput').value = '';
    document.getElementById('goalInitialSavedInput').value = '';
    document.getElementById('goalDueDateInput').value = calculateFutureDate(60);
    document.getElementById('modalGoal').classList.add('active');
}

function openEditGoalModal(id) {
    const goal = state.goals.find(g => g.id === id);
    if (!goal) return;

    editingGoalId = id;
    document.getElementById('modalGoalTitle').textContent = 'Edit Savings Goal';
    document.getElementById('goalNameInput').value = goal.title;
    document.getElementById('goalTargetInput').value = goal.target;
    document.getElementById('goalInitialSavedInput').value = goal.saved;
    document.getElementById('goalDueDateInput').value = goal.dueDate;
    document.getElementById('modalGoal').classList.add('active');
}

async function handleSaveGoal(e) {
    e.preventDefault();
    const title = document.getElementById('goalNameInput').value.trim();
    const target = parseFloat(document.getElementById('goalTargetInput').value);
    const saved = parseFloat(document.getElementById('goalInitialSavedInput').value) || 0;
    const dueDate = document.getElementById('goalDueDateInput').value;

    if (!title || !target || target <= 0) {
        showToast('Please specify a title and target amount.', 'danger');
        return;
    }

    const payload = { title, target, saved, dueDate };

    if (editingGoalId) {
        if (isConnectedToBackend) {
            try {
                await fetch(`${API_BASE}/goals/${editingGoalId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch (err) { console.error(err); }
        }
        const idx = state.goals.findIndex(g => g.id === editingGoalId);
        if (idx !== -1) {
            state.goals[idx] = { ...state.goals[idx], ...payload };
        }
        showToast('Goal updated.');
    } else {
        payload.id = 'goal-' + Date.now();
        payload.contributions = saved > 0 ? [{ id: 'c-' + Date.now(), amount: saved, date: getTodayString() }] : [];
        payload.createdAt = Date.now();

        if (isConnectedToBackend) {
            try {
                const res = await fetch(`${API_BASE}/goals`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    const created = await res.json();
                    payload.id = created.id;
                }
            } catch (err) { console.error(err); }
        }
        state.goals.push(payload);
        showToast(`Savings target for "${title}" set!`);
    }

    saveToLocalStorage();
    closeModals();
    renderCurrentView();
}

function confirmDeleteGoal(id) {
    const goal = state.goals.find(g => g.id === id);
    if (!goal) return;

    openConfirmModal(
        'Delete Savings Goal',
        `Are you sure you want to delete the goal "${goal.title}"?`,
        async () => {
            if (isConnectedToBackend) {
                try {
                    await fetch(`${API_BASE}/goals/${id}`, { method: 'DELETE' });
                } catch (e) { console.error(e); }
            }
            state.goals = state.goals.filter(g => g.id !== id);
            saveToLocalStorage();
            showToast('Goal deleted.');
            renderCurrentView();
        }
    );
}

// Contribution
function openAddContributionModal(goalId, title) {
    contributingGoalId = goalId;
    document.getElementById('contribGoalTitle').textContent = `Deposit towards "${title}"`;
    document.getElementById('contribAmountInput').value = '';
    document.getElementById('contribDateInput').value = getTodayString();
    document.getElementById('modalContribution').classList.add('active');
}

async function handleSaveContribution(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('contribAmountInput').value);
    const date = document.getElementById('contribDateInput').value;

    if (!amount || amount <= 0) {
        showToast('Please enter a deposit amount.', 'danger');
        return;
    }

    const goal = state.goals.find(g => g.id === contributingGoalId);
    if (!goal) return;

    if (isConnectedToBackend) {
        try {
            await fetch(`${API_BASE}/goals/${contributingGoalId}/contributions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, date })
            });
        } catch (err) { console.error(err); }
    }

    goal.saved = Math.round((goal.saved + amount) * 100) / 100;
    goal.contributions = goal.contributions || [];
    goal.contributions.unshift({ id: 'c-' + Date.now(), amount, date });

    saveToLocalStorage();
    closeModals();
    showToast(`Added ${formatPKR(amount)} to "${goal.title}"!`);
    renderCurrentView();
}

// Budget Modals
function openOverallBudgetModal() {
    document.getElementById('overallBudgetInput').value = state.budget.overall || 150000;
    document.getElementById('modalOverallBudget').classList.add('active');
}

async function handleSaveOverallBudget(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('overallBudgetInput').value) || 0;
    
    if (isConnectedToBackend) {
        try {
            await fetch(`${API_BASE}/budget/overall`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ overall: amount })
            });
        } catch (err) { console.error(err); }
    }

    state.budget.overall = amount;
    saveToLocalStorage();
    closeModals();
    showToast(`Monthly budget limit set to ${formatPKR(amount)}`);
    renderCurrentView();
}

let activeEditCategory = null;
function openCategoryLimitModal(category, currentLimit) {
    activeEditCategory = category;
    document.getElementById('modalCategoryTitle').textContent = `Set Limit for ${category}`;
    document.getElementById('categoryLimitInput').value = currentLimit || '';
    document.getElementById('modalCategoryLimit').classList.add('active');
}

async function handleSaveCategoryLimit(e) {
    e.preventDefault();
    const limit = parseFloat(document.getElementById('categoryLimitInput').value) || 0;

    if (isConnectedToBackend) {
        try {
            await fetch(`${API_BASE}/budget/category`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: activeEditCategory, limit })
            });
        } catch (err) { console.error(err); }
    }

    if (limit > 0) {
        state.budget.categories[activeEditCategory] = limit;
    } else {
        delete state.budget.categories[activeEditCategory];
    }

    saveToLocalStorage();
    closeModals();
    showToast(`Budget for ${activeEditCategory} updated.`);
    renderCurrentView();
}

// Confirmation Dialog Modal
function openConfirmModal(title, message, onConfirm) {
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalMsg').textContent = message;
    confirmCallback = onConfirm;
    document.getElementById('modalConfirm').classList.add('active');
}

function handleConfirmExecute() {
    if (confirmCallback) {
        confirmCallback();
        confirmCallback = null;
    }
    closeModals();
}

function closeModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
}

// Data Export & Reset
function exportToCSV() {
    if (state.transactions.length === 0) {
        showToast('No transactions to export.', 'info');
        return;
    }

    const headers = ['ID', 'Type', 'Amount (PKR)', 'Category', 'Description', 'Date'];
    const rows = state.transactions.map(t => [
        t.id,
        t.type,
        t.amount,
        `"${t.category.replace(/"/g, '""')}"`,
        `"${t.description.replace(/"/g, '""')}"`,
        t.date
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KharchaWise_Transactions_${getTodayString()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Transactions exported to CSV.');
}

function exportJSONBackup() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `KharchaWise_Backup_${getTodayString()}.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
    showToast('Backup JSON downloaded.');
}

function handleImportJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (!imported.transactions || !imported.budget) {
                showToast('Invalid backup file format.', 'danger');
                return;
            }

            if (isConnectedToBackend) {
                await fetch(`${API_BASE}/restore`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(imported)
                });
            }

            state = imported;
            saveToLocalStorage();
            showToast('Backup restored successfully!');
            renderCurrentView();
        } catch (err) {
            showToast('Failed to parse backup JSON: ' + err.message, 'danger');
        }
    };
    reader.readAsText(file);
}

function confirmResetAllData() {
    openConfirmModal(
        'Reset All Financial Data',
        'Warning: This will permanently wipe all transactions, budget limits, and savings goals from both local storage and database. Are you sure?',
        async () => {
            if (isConnectedToBackend) {
                try {
                    await fetch(`${API_BASE}/reset`, { method: 'POST' });
                } catch (e) { console.error(e); }
            }
            localStorage.removeItem(STORAGE_KEY);
            state = {
                version: 1,
                transactions: [],
                budget: { overall: 0, categories: {} },
                goals: [],
                settings: { currency: 'PKR', theme: 'dark' }
            };
            showToast('All financial data has been wiped.');
            renderCurrentView();
        }
    );
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Initialization & Event Listeners
window.addEventListener('DOMContentLoaded', () => {
    // Populate month filter dropdown with current and past 6 months
    const monthFilter = document.getElementById('txMonthFilter');
    if (monthFilter) {
        const now = new Date();
        let opts = `<option value="">All Months</option>`;
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            opts += `<option value="${val}">${label}</option>`;
        }
        monthFilter.innerHTML = opts;
    }

    // Hash change router listener
    window.addEventListener('hashchange', handleRoute);

    // Initial load
    loadData().then(() => {
        handleRoute();
    });

    // Mobile menu toggle
    const toggleBtn = document.getElementById('mobileMenuToggle');
    const drawer = document.getElementById('mobileDrawer');
    if (toggleBtn && drawer) {
        toggleBtn.addEventListener('click', () => {
            drawer.style.display = drawer.style.display === 'flex' ? 'none' : 'flex';
        });
    }

    // Modal backdrop click to close
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModals();
        });
    });

    // Transaction filter pills
    document.querySelectorAll('.pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTransactions();
        });
    });
});
