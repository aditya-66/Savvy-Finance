import { updateCategoryChart, updateChart, updateBudgetHealthChart } from './chart-config.js';

// Auth Check
const token = localStorage.getItem('savvy_auth_token');
if (!token) {
    window.location.href = 'login.html';
}

const userName = localStorage.getItem('savvy_user_name') || 'User';
const userSpans = document.querySelectorAll('.user-profile span');
userSpans.forEach(s => s.innerText = userName);

// Utility to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    return str.toString().replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

// Global State
const state = {
    categoryTotals: {},
    dailyLimit: 0,
    dailySpent: 0,
    targetGoal: 0,
    savingsTotal: 0,
    emergencyFund: 0,
    fixedNeeds: 0,
    bufferPct: 0,
    expensesHistory: Array(30).fill(0), 
    savingsHistory: Array(31).fill(0),
    income: 0,
    transactions: [], // for the table
    allTransactions: [] // including soft deleted
};

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 1. Routing Logic ---
    const views = document.querySelectorAll('.view');
    const navLinks = document.querySelectorAll('[data-view]');

    function switchView(viewId) {
        views.forEach(v => v.classList.add('hidden'));
        document.getElementById('view-' + viewId).classList.remove('hidden');
        
        navLinks.forEach(link => {
            if (link.getAttribute('data-view') === viewId) link.classList.add('active');
            else link.classList.remove('active');
        });
        
        if (viewId === 'transactions') loadAllTransactions();
        if (viewId === 'health') initBudgetHealth();
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(link.getAttribute('data-view'));
        });
    });

    // --- 2. Popups & Modals ---
    const settingsBtn = document.getElementById('sidebar-settings-btn');
    const settingsPopup = document.getElementById('settings-popup');
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsPopup.classList.toggle('hidden');
    });
    
    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
        if (!settingsPopup.contains(e.target) && !settingsBtn.contains(e.target)) {
            settingsPopup.classList.add('hidden');
        }
    });
    
    document.getElementById('popup-account-btn').addEventListener('click', () => {
        settingsPopup.classList.add('hidden');
        switchView('account');
    });
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('savvy_auth_token');
        window.location.href = 'login.html';
    });
    document.getElementById('nav-account-btn').addEventListener('click', () => {
        switchView('account');
    });
    document.getElementById('goto-analytics-btn').addEventListener('click', () => {
        switchView('analytics');
    });

    const budgetBtn = document.getElementById('nav-budget-btn');
    const budgetModal = document.getElementById('budget-modal');
    budgetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('budget-input').value = state.income || '';
        document.getElementById('savings-target-input').value = state.targetGoal || '';
        document.getElementById('emergency-target-input').value = state.emergencyFund || '';
        document.getElementById('fixed-needs-input').value = state.fixedNeeds || '';
        document.getElementById('misc-buffer-input').value = state.bufferPct || '';
        budgetModal.classList.remove('hidden');
    });
    document.getElementById('close-budget-btn').addEventListener('click', () => {
        budgetModal.classList.add('hidden');
    });

    // --- 3. Data Fetching ---
    async function loadProfile() {
        try {
            const response = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                const user = await response.json();
                state.income = parseFloat(user.monthly_budget) || 0;
                state.targetGoal = parseFloat(user.target_savings) || 0;
                state.emergencyFund = parseFloat(user.emergency_fund_target) || 0;
                state.fixedNeeds = parseFloat(user.fixed_needs) || 0;
                state.bufferPct = parseInt(user.misc_buffer_pct, 10) || 0;
                state.dailyLimit = state.income; // simplified limit to monthly budget for now
                
                document.getElementById('acc-name').innerText = user.name;
                document.getElementById('acc-email').innerText = user.email;
                document.getElementById('acc-date').innerText = new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                document.getElementById('acc-budget').innerText = `₹${state.income}`;
                document.getElementById('acc-savings').innerText = `₹${state.targetGoal}`;
                document.getElementById('target-label-text').innerText = `/ ₹${state.targetGoal}`;
            }
        } catch (err) { console.error(err); }
    }

    async function loadActiveTransactions() {
        try {
            const response = await fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                state.transactions = await response.json();
                calculateTotals();
            }
        } catch (err) { console.error(err); }
    }

    async function loadAllTransactions() {
        try {
            const response = await fetch('/api/transactions/all', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                state.allTransactions = await response.json();
                renderTransactionsTable();
            }
        } catch (err) { console.error(err); }
    }

    function calculateTotals() {
        state.categoryTotals = {};
        state.dailySpent = 0;
        
        state.transactions.forEach(t => {
            const amt = parseFloat(t.amount);
            const isIncome = amt < 0 || (t.category && t.category.toLowerCase() === 'add money');
            if (!isIncome) {
                const cat = t.category || 'Miscellaneous';
                state.categoryTotals[cat] = (state.categoryTotals[cat] || 0) + amt;
            }
            state.dailySpent += amt;
        });
        
        state.savingsTotal = state.income - state.dailySpent;
        updateUI();
    }

    // --- 4. Budget & Account Handlers ---
    document.getElementById('save-budget-btn').addEventListener('click', async () => {
        const budget = parseFloat(document.getElementById('budget-input').value) || 0;
        const savings = parseFloat(document.getElementById('savings-target-input').value) || 0;
        const emergency_fund = parseFloat(document.getElementById('emergency-target-input').value) || 0;
        const fixed_needs = parseFloat(document.getElementById('fixed-needs-input').value) || 0;
        const misc_buffer = parseInt(document.getElementById('misc-buffer-input').value, 10) || 0;
        
        try {
            const res = await fetch('/api/auth/budget', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ budget, savings, emergency_fund, fixed_needs, misc_buffer })
            });
            if (res.ok) {
                budgetModal.classList.add('hidden');
                await loadProfile();
                calculateTotals();
            }
        } catch (err) { console.error(err); }
    });



    // --- Budget Health Logic ---
    function initBudgetHealth() {
        document.getElementById('health-income-range').value = state.income;
        document.getElementById('health-income-input').value = state.income;
        
        document.getElementById('health-savings-input').value = state.targetGoal;
        document.getElementById('health-emergency-input').value = state.emergencyFund;
        document.getElementById('health-fixed-input').value = state.fixedNeeds;
        
        document.getElementById('health-buffer-range').value = state.bufferPct;
        document.getElementById('health-buffer-input').value = state.bufferPct;

        renderBudgetHealth();
    }

    function renderBudgetHealth() {
        const income = parseFloat(document.getElementById('health-income-input').value) || 0;
        const savings = parseFloat(document.getElementById('health-savings-input').value) || 0;
        const emergency = parseFloat(document.getElementById('health-emergency-input').value) || 0;
        const fixed = parseFloat(document.getElementById('health-fixed-input').value) || 0;
        const bufferPct = parseFloat(document.getElementById('health-buffer-input').value) || 0;

        let buffer = (income * bufferPct) / 100;
        let safe = income - savings - emergency - fixed - buffer;
        let deficit = 0;
        if (safe < 0) {
            deficit = Math.abs(safe);
            safe = 0;
        }

        document.getElementById('health-safe-to-spend').innerText = `₹${safe.toFixed(2)}`;

        const savingsRate = income > 0 ? (savings / income) * 100 : 0;
        let grade = "C (Warning)";
        if (deficit > 0) {
            grade = "D (Danger)";
            document.getElementById('health-budget-grade').style.color = "#FF8A65";
        } else if (savingsRate >= 20 && safe > 0) {
            grade = "A (Excellent)";
            document.getElementById('health-budget-grade').style.color = "#69F0AE";
        } else if (savingsRate >= 10 && safe >= 0) {
            grade = "B (Good)";
            document.getElementById('health-budget-grade').style.color = "#448AFF";
        } else {
            document.getElementById('health-budget-grade').style.color = "#FFCA28";
        }

        document.getElementById('health-budget-grade').innerText = grade;
        updateBudgetHealthChart(income, savings, emergency, fixed, bufferPct);
    }

    ['health-income-range', 'health-income-input', 'health-savings-input', 'health-emergency-input', 'health-fixed-input', 'health-buffer-range', 'health-buffer-input'].forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            if (id === 'health-income-range') document.getElementById('health-income-input').value = e.target.value;
            if (id === 'health-income-input') document.getElementById('health-income-range').value = e.target.value;
            if (id === 'health-buffer-range') document.getElementById('health-buffer-input').value = e.target.value;
            if (id === 'health-buffer-input') document.getElementById('health-buffer-range').value = e.target.value;
            renderBudgetHealth();
        });
    });

    // Start App
    // loadProfile();
    // loadActiveTransactions();

    document.getElementById('generate-telegram-btn').addEventListener('click', async () => {
        try {
            const res = await fetch('/api/auth/telegram-token', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                const tokenDisplay = document.getElementById('telegram-token-display');
                tokenDisplay.innerText = data.token;
                tokenDisplay.style.display = 'block';
            } else {
                alert('Failed to generate token.');
            }
        } catch (err) { console.error(err); }
    });

    document.getElementById('delete-account-btn').addEventListener('click', async () => {
        if (confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) {
            try {
                const res = await fetch('/api/auth/account', {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    localStorage.removeItem('savvy_auth_token');
                    window.location.href = 'login.html';
                }
            } catch (err) { console.error(err); }
        }
    });

    // --- 5. UI Updates ---
    function updateUI() {
        const totalSpent = state.dailySpent;
        document.getElementById('total-spent').innerText = `₹${totalSpent.toFixed(2)}`;
        
        const gaugeFill = document.getElementById('gauge-fill');
        const gaugeNeedle = document.getElementById('gauge-needle');
        const maxDashOffset = 125.6; 
        let ratio = state.dailyLimit > 0 ? (state.dailySpent / state.dailyLimit) : 0;
        if (ratio > 1) ratio = 1; 
        
        const offset = maxDashOffset - (ratio * maxDashOffset);
        if(gaugeFill) gaugeFill.style.strokeDashoffset = offset;
        
        const angle = ratio * 180;
        if(gaugeNeedle) gaugeNeedle.setAttribute('transform', `rotate(${angle}, 50, 50)`);

        const ringFill = document.getElementById('ring-fill');
        const ringMaxOffset = 251.2; 
        let ringRatio = state.targetGoal > 0 ? (state.savingsTotal / state.targetGoal) : 0;
        if (ringRatio > 1) ringRatio = 1;
        if (ringRatio < 0) ringRatio = 0;
        
        const ringOffset = ringMaxOffset - (ringRatio * ringMaxOffset);
        if(ringFill) ringFill.style.strokeDashoffset = ringOffset;
        
        document.getElementById('savings-amount').innerText = `₹${Math.max(0, state.savingsTotal).toFixed(0)}`;
        const remainingTextEl = document.querySelector('.remaining-text');
        if (state.savingsTotal >= state.targetGoal) {
            const surplus = state.savingsTotal - state.targetGoal;
            remainingTextEl.innerHTML = `Goal Achieved! Surplus: <span id="remaining-amount" style="color: #00E676;">₹${surplus.toFixed(0)}</span>`;
        } else {
            const remaining = state.targetGoal - state.savingsTotal;
            remainingTextEl.innerHTML = `Remaining to hit goal: <span id="remaining-amount">₹${remaining.toFixed(0)}</span>`;
        }

        updateCategoryChart(state.categoryTotals);
        
        state.expensesHistory[state.expensesHistory.length - 1] = state.dailySpent;
        state.savingsHistory[state.savingsHistory.length - 1] = state.savingsTotal;
        updateChart(state.expensesHistory, state.savingsHistory, state.income);
        
        // Render Recent Activity
        const recentList = document.getElementById('recent-list');
        if (state.transactions.length === 0) {
            recentList.innerHTML = '<p style="color: #8E9BAE; font-size: 14px; text-align: center; margin-top: 20px;">No recent activity.</p>';
        } else {
            recentList.innerHTML = '';
            const recent = state.transactions.slice(0, 5); // top 5
            recent.forEach(t => {
                const item = document.createElement('div');
                item.className = 'recent-item';
                const amt = parseFloat(t.amount);
                const isIncome = amt < 0 || t.category.toLowerCase() === 'add money';
                const sign = isIncome ? '+' : '-';
                const displayAmt = Math.abs(amt).toFixed(0);
                const catClass = isIncome ? 'income' : t.category.toLowerCase();
                item.innerHTML = `
                    <div>
                        <span class="title">${escapeHTML(t.category)}</span>
                        <span class="date">${new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                    </div>
                    <div class="amt ${catClass}">${sign}₹${displayAmt}</div>
                `;
                recentList.appendChild(item);
            });
        }
    }

    function renderTransactionsTable() {
        const tbody = document.getElementById('transactions-tbody');
        tbody.innerHTML = '';
        state.allTransactions.forEach(t => {
            const tr = document.createElement('tr');
            const dateStr = new Date(t.date).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            const amt = parseFloat(t.amount);
            const isIncome = amt < 0 || t.category.toLowerCase() === 'add money';
            const displayAmt = Math.abs(amt).toFixed(2);
            const displaySign = isIncome ? '+' : '';
            const color = isIncome ? '#00E676' : 'var(--text-main)';

            tr.innerHTML = `
                <td>${dateStr}</td>
                <td>${escapeHTML(t.title)}</td>
                <td style="color: ${color}">${displaySign}₹${displayAmt}</td>
                <td>${escapeHTML(t.category)}</td>
                <td><span style="color: ${t.is_deleted ? '#ff3366' : '#00E676'}">${t.is_deleted ? 'Deleted' : 'Active'}</span></td>
                <td>
                    ${!t.is_deleted ? `<button class="action-btn delete" data-id="${t.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>` : `<button class="action-btn restore" data-id="${t.id}" title="Restore"><i class="fa-solid fa-rotate-left"></i></button>`}
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Bind events
        document.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                await fetch(`/api/transactions/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
                await loadAllTransactions();
                await loadActiveTransactions();
            });
        });
        document.querySelectorAll('.action-btn.restore').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                await fetch(`/api/transactions/${id}/restore`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }});
                await loadAllTransactions();
                await loadActiveTransactions();
            });
        });
    }

    // --- 6. Expense Handlers ---
    async function handleAddExpense(amount, category, isRefund = false) {
        if (!amount || isNaN(amount) || amount === 0) {
            alert('Please enter a valid amount.');
            return;
        }
        
        if (category.toLowerCase() === 'add money' && !isRefund) {
            isRefund = true;
        }
        
        const finalAmount = isRefund ? -Math.abs(amount) : Math.abs(amount);
        const title = isRefund ? 'Income / Refund' : 'Expense';
        
        try {
            const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, amount: finalAmount, category: formattedCategory })
            });
            if (response.ok) {
                await loadActiveTransactions();
            } else {
                alert('Failed to save transaction.');
            }
        } catch(err) { console.error(err); }
    }

    const addBtn = document.getElementById('add-expense-btn');
    const refundBtn = document.getElementById('add-refund-btn');

    function processTransaction(isRefund) {
        let amt = parseFloat(document.getElementById('amount').value);
        const cat = document.getElementById('category').value;
        
        const activeTimeframeBtn = document.querySelector('.timeframe-toggles button.active');
        if (activeTimeframeBtn) {
            const timeframe = activeTimeframeBtn.innerText.toLowerCase();
            if (timeframe === 'week') amt *= 4; 
            else if (timeframe === 'year') amt /= 12; 
        }
        
        handleAddExpense(amt, cat, isRefund);
        document.getElementById('amount').value = '';
    }

    if(addBtn) addBtn.addEventListener('click', () => processTransaction(false));
    if(refundBtn) refundBtn.addEventListener('click', () => processTransaction(true));

    const quickAddInput = document.getElementById('quick-add-input');
    if(quickAddInput) {
        quickAddInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const val = quickAddInput.value.toLowerCase();
                let amountMatch = val.match(/[₹]?(\d+(\.\d{1,2})?)/);
                let cat = val.includes('need') ? 'needs' : 'wants';
                if (amountMatch) {
                    handleAddExpense(parseFloat(amountMatch[1]), cat);
                    quickAddInput.value = '';
                }
            }
        });
    }

    // Timeframe visual toggles
    const timeframeBtns = document.querySelectorAll('.timeframe-toggles button');
    timeframeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            timeframeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    // --- Global Search Logic ---
    const searchInput = document.getElementById('global-search');
    const searchDropdown = document.getElementById('search-dropdown');
    
    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            searchDropdown.classList.add('hidden');
            searchDropdown.innerHTML = '';
            return;
        }

        // Lazy load all transactions if not already loaded
        if (state.allTransactions.length === 0) {
            try {
                const response = await fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } });
                if (response.ok) {
                    state.allTransactions = await response.json();
                }
            } catch (err) { console.error(err); }
        }

        const matches = state.allTransactions.filter(t => 
            (t.category && t.category.toLowerCase().includes(query)) ||
            (t.title && t.title.toLowerCase().includes(query))
        );

        searchDropdown.innerHTML = '';
        if (matches.length === 0) {
            searchDropdown.innerHTML = '<div class="search-empty">No results found</div>';
        } else {
            matches.slice(0, 15).forEach(t => {
                const item = document.createElement('div');
                item.className = 'search-item';
                const dateStr = new Date(t.date).toLocaleDateString();
                const isIncome = parseFloat(t.amount) < 0 || (t.category && t.category.toLowerCase() === 'add money');
                const amtColor = isIncome ? '#00E676' : '#FF5252';
                const amtSign = isIncome ? '+' : '';
                item.innerHTML = `
                    <div>
                        <div style="font-weight: 500; color: #fff;">${escapeHTML(t.title)}</div>
                        <div style="font-size: 12px; color: #8E9BAE;">${escapeHTML(t.category)} • ${dateStr}</div>
                    </div>
                    <div style="color: ${amtColor}; font-weight: 600;">
                        ${amtSign}₹${Math.abs(parseFloat(t.amount)).toFixed(2)}
                    </div>
                `;
                searchDropdown.appendChild(item);
            });
        }
        searchDropdown.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
        if (searchInput && searchDropdown && !searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.add('hidden');
        }
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length > 0) {
            searchDropdown.classList.remove('hidden');
        }
    });

    // Boot
    await loadProfile();
    await loadActiveTransactions();
    state.allTransactions = state.transactions;
});
