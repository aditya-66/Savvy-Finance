import { updateCategoryChart, updateChart, updateBudgetHealthChart, resizeCharts } from './chart-config.js';

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

// --- Auto-Categorization Map ---
const categoryKeywords = {
    'Food & Dining': [
        'tea', 'chai', 'coffee', 'food', 'lunch', 'dinner', 'breakfast', 'snack', 'snacks',
        'pizza', 'burger', 'sandwich', 'noodles', 'noodle', 'maggi', 'momos', 'momo',
        'samosa', 'pani puri', 'golgappa', 'chaat', 'biryani', 'rice', 'roti', 'dal',
        'paratha', 'dosa', 'idli', 'vada', 'pav bhaji', 'chole', 'paneer',
        'chicken', 'mutton', 'fish', 'egg', 'omelette', 'thali',
        'cake', 'pastry', 'chocolate', 'ice cream', 'icecream', 'kulfi', 'sweet', 'mithai',
        'biscuit', 'cookies', 'chips', 'namkeen', 'bhujia',
        'juice', 'lassi', 'milkshake', 'shake', 'smoothie', 'cold drink', 'soda', 'pepsi', 'coke', 'sprite',
        'water', 'milk', 'curd', 'butter', 'ghee', 'oil', 'sugar', 'salt', 'flour', 'atta',
        'fruit', 'fruits', 'apple', 'banana', 'mango', 'grapes', 'orange', 'papaya',
        'vegetable', 'vegetables', 'sabzi', 'onion', 'potato', 'tomato',
        'swiggy', 'zomato', 'restaurant', 'cafe', 'dhaba', 'canteen', 'mess', 'tiffin',
        'grocery', 'groceries', 'kirana', 'provision', 'ration',
        'bread', 'jam', 'sauce', 'ketchup', 'mayo', 'cheese', 'paneer',
        'toffee', 'candy', 'gum', 'mints', 'lollipop',
        'wine', 'beer', 'alcohol', 'liquor', 'drink', 'drinks',
        'popcorn', 'peanut', 'peanuts', 'dry fruits', 'cashew', 'almond', 'raisin'
    ],
    'Transportation': [
        'uber', 'ola', 'auto', 'rickshaw', 'taxi', 'cab', 'bus', 'metro', 'train', 'railway',
        'flight', 'airplane', 'airport', 'petrol', 'diesel', 'fuel', 'gas', 'cng',
        'parking', 'toll', 'fastag', 'car wash', 'servicing', 'repair',
        'bike', 'scooter', 'cycle', 'vehicle', 'car', 'travel', 'trip', 'commute',
        'rapido', 'indriver', 'fare', 'ticket', 'pass'
    ],
    'Housing': [
        'rent', 'emi', 'mortgage', 'home loan', 'house', 'flat', 'apartment',
        'maintenance', 'society', 'property', 'broker', 'brokerage',
        'plumber', 'electrician', 'carpenter', 'painter', 'pest control',
        'furniture', 'sofa', 'bed', 'table', 'chair', 'mattress', 'pillow', 'curtain',
        'ac repair', 'fridge', 'washing machine', 'geyser', 'cooler'
    ],
    'Entertainment': [
        'movie', 'movies', 'cinema', 'pvr', 'inox', 'theatre', 'theater',
        'netflix', 'hotstar', 'prime', 'spotify', 'youtube', 'subscription',
        'game', 'games', 'gaming', 'ps5', 'xbox', 'steam', 'pubg',
        'concert', 'show', 'event', 'party', 'club', 'bar', 'pub',
        'outing', 'picnic', 'trip', 'vacation', 'holiday', 'park', 'museum', 'zoo'
    ],
    'Shopping': [
        'amazon', 'flipkart', 'myntra', 'meesho', 'ajio', 'nykaa',
        'clothes', 'clothing', 'shirt', 'tshirt', 't-shirt', 'jeans', 'pant', 'shorts',
        'shoes', 'sneakers', 'sandals', 'chappal', 'slipper',
        'watch', 'bag', 'backpack', 'wallet', 'purse', 'belt',
        'phone', 'mobile', 'laptop', 'tablet', 'earphones', 'headphones', 'charger', 'cable',
        'accessories', 'jewellery', 'jewelry', 'ring', 'chain', 'bracelet',
        'cosmetics', 'makeup', 'perfume', 'deodorant', 'sunscreen', 'cream',
        'gift', 'present', 'shopping'
    ],
    'Bills & Utilities': [
        'electricity', 'electric', 'bijli', 'power', 'light bill',
        'water bill', 'gas bill', 'internet', 'wifi', 'broadband', 'airtel', 'jio', 'vi', 'bsnl',
        'recharge', 'mobile bill', 'phone bill', 'postpaid', 'prepaid',
        'dth', 'tata sky', 'dish tv', 'cable', 'insurance', 'premium',
        'tax', 'gst', 'income tax', 'laundry', 'dry clean', 'ironing'
    ],
    'Needs': [
        'medicine', 'medical', 'doctor', 'hospital', 'clinic', 'pharmacy', 'chemist',
        'health', 'checkup', 'test', 'lab', 'blood test', 'xray',
        'soap', 'shampoo', 'toothpaste', 'brush', 'razor', 'sanitary',
        'tissue', 'detergent', 'surf', 'cleaner', 'mop', 'broom',
        'school', 'college', 'tuition', 'fees', 'book', 'books', 'stationery', 'pen', 'notebook',
        'gym', 'fitness', 'yoga', 'protein', 'supplement'
    ],
    'Wants': [
        'luxury', 'premium', 'designer', 'branded',
        'spa', 'salon', 'haircut', 'facial', 'massage', 'parlour', 'parlor',
        'tattoo', 'piercing', 'hobby', 'art', 'craft', 'music', 'instrument',
        'gadget', 'drone', 'camera', 'gopro', 'smartwatch'
    ],
    'Add Money': [
        'add money', 'salary', 'income', 'refund', 'cashback', 'received', 'credited',
        'bonus', 'freelance', 'payment received', 'pocket money', 'allowance', 'stipend'
    ]
};

function detectCategory(title) {
    if (!title) return null;
    const lower = title.toLowerCase().trim();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        for (const kw of keywords) {
            if (lower === kw || lower.includes(kw)) {
                return category;
            }
        }
    }
    return null;
}

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
        
        // Force chart resize now that container is visible
        setTimeout(() => resizeCharts(), 10);
        
        if (viewId === 'transactions') loadAllTransactions();
        if (viewId === 'trash') loadAllTransactions();
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
        
        const checkboxes = document.querySelectorAll('#discretionary-checkboxes input[type="checkbox"]');
        const cats = state.discretionaryCategories || [];
        checkboxes.forEach(cb => cb.checked = cats.includes(cb.value));
        
        budgetModal.classList.remove('hidden');
    });
    document.getElementById('close-budget-btn').addEventListener('click', () => {
        budgetModal.classList.add('hidden');
    });

    // --- 3. Data Fetching ---
    async function loadProfile() {
        try {
            const response = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('savvy_auth_token');
                window.location.href = 'login.html';
                return;
            }
            if (response.ok) {
                const user = await response.json();
                state.income = parseFloat(user.monthly_budget) || 0;
                state.targetGoal = parseFloat(user.target_savings) || 0;
                state.emergencyFund = parseFloat(user.emergency_fund_target) || 0;
                state.fixedNeeds = parseFloat(user.fixed_needs) || 0;
                state.bufferPct = parseInt(user.misc_buffer_pct, 10) || 0;
                
                try {
                    state.discretionaryCategories = user.discretionary_categories ? JSON.parse(user.discretionary_categories) : ['Wants', 'Entertainment', 'Shopping', 'Food & Dining', 'Miscellaneous', 'Needs'];
                } catch(e) {
                    state.discretionaryCategories = ['Wants', 'Entertainment', 'Shopping', 'Food & Dining', 'Miscellaneous', 'Needs'];
                }

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
                if (typeof renderTrashTable === 'function') renderTrashTable();
            }
        } catch (err) { console.error(err); }
    }

    function calculateTotals() {
        state.categoryTotals = {};
        state.discretionarySpent = 0;
        let expenses = 0;
        let actualIncome = 0;
        
        state.transactions.forEach(t => {
            const amt = parseFloat(t.amount);
            const isIncome = amt < 0 || (t.category && t.category.toLowerCase() === 'add money');
            
            if (isIncome) {
                actualIncome += Math.abs(amt);
            } else {
                const cat = t.category || 'Miscellaneous';
                state.categoryTotals[cat] = (state.categoryTotals[cat] || 0) + amt;
                expenses += amt;
                if (state.discretionaryCategories && state.discretionaryCategories.includes(cat)) {
                    state.discretionarySpent += amt;
                }
            }
        });
        
        state.dailySpent = expenses;
        state.savingsTotal = actualIncome - expenses;
        updateUI();
    }

    // --- 4. Budget & Account Handlers ---
    document.getElementById('save-budget-btn').addEventListener('click', async () => {
        const budget = parseFloat(document.getElementById('budget-input').value) || 0;
        const savings = parseFloat(document.getElementById('savings-target-input').value) || 0;
        const emergency_fund = parseFloat(document.getElementById('emergency-target-input').value) || 0;
        const fixed_needs = parseFloat(document.getElementById('fixed-needs-input').value) || 0;
        const misc_buffer = parseInt(document.getElementById('misc-buffer-input').value, 10) || 0;
        
        const checkboxes = document.querySelectorAll('#discretionary-checkboxes input[type="checkbox"]:checked');
        const discretionary_categories = Array.from(checkboxes).map(cb => cb.value);
        
        try {
            const res = await fetch('/api/auth/budget', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ budget, savings, emergency_fund, fixed_needs, misc_buffer, discretionary_categories })
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

        const spent = state.discretionarySpent || 0;
        let remaining = safe - spent;
        if (remaining < 0) remaining = 0;

        document.getElementById('health-safe-to-spend').innerText = `₹${safe.toFixed(2)}`;
        document.getElementById('health-safe-spent').innerText = `₹${spent.toFixed(2)}`;
        document.getElementById('health-safe-remaining').innerText = `₹${remaining.toFixed(2)}`;

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
        
        if (typeof calculateDurationSummary === 'function') {
            calculateDurationSummary();
        }
        if (typeof calculateAnalyticsSummary === 'function') {
            calculateAnalyticsSummary();
        }
        
        renderBudgetHealth();
    }

    function calculateDurationSummary() {
        const activeBtn = document.querySelector('.duration-toggles button.active');
        if (!activeBtn) return;
        const durationType = activeBtn.dataset.duration;

        let startDate = new Date();
        let endDate = new Date();
        startDate.setHours(0,0,0,0);
        endDate.setHours(23,59,59,999);

        if (durationType === 'daily') {
            // Keep today
        } else if (durationType === 'weekly') {
            const day = startDate.getDay();
            const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
            startDate.setDate(diff);
        } else if (durationType === 'monthly') {
            startDate.setDate(1);
        } else if (durationType === 'custom') {
            const startVal = document.getElementById('duration-start').value;
            const endVal = document.getElementById('duration-end').value;
            if (startVal && endVal) {
                startDate = new Date(startVal);
                startDate.setHours(0,0,0,0);
                endDate = new Date(endVal);
                endDate.setHours(23,59,59,999);
            }
        }

        let totalExp = 0;
        let totalInc = 0;
        const filteredTxs = [];

        state.transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate >= startDate && tDate <= endDate) {
                filteredTxs.push(t);
                const amt = parseFloat(t.amount);
                const isIncome = amt < 0 || (t.category && t.category.toLowerCase() === 'add money');
                if (isIncome) {
                    totalInc += Math.abs(amt);
                } else {
                    totalExp += amt;
                }
            }
        });

        document.getElementById('duration-expenses-total').innerText = `₹${totalExp.toFixed(2)}`;
        document.getElementById('duration-income-total').innerText = `₹${totalInc.toFixed(2)}`;
        
        let labels = [];
        let expData = [];
        let incData = [];
        let savData = [];

        if (durationType === 'daily') {
            labels = Array.from({length: 24}, (_, i) => `${i}:00`);
            expData = Array(24).fill(0);
            incData = Array(24).fill(0);
            filteredTxs.forEach(t => {
                const hour = new Date(t.date).getHours();
                const amt = parseFloat(t.amount);
                const isIncome = amt < 0 || (t.category && t.category.toLowerCase() === 'add money');
                if (isIncome) incData[hour] += Math.abs(amt);
                else expData[hour] += amt;
            });
            savData = incData.map((inc, i) => inc - expData[i]);
        } else if (durationType === 'weekly') {
            labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            expData = Array(7).fill(0);
            incData = Array(7).fill(0);
            filteredTxs.forEach(t => {
                const day = new Date(t.date).getDay();
                const amt = parseFloat(t.amount);
                const isIncome = amt < 0 || (t.category && t.category.toLowerCase() === 'add money');
                if (isIncome) incData[day] += Math.abs(amt);
                else expData[day] += amt;
            });
            savData = incData.map((inc, i) => inc - expData[i]);
        } else if (durationType === 'monthly') {
            const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
            labels = Array.from({length: daysInMonth}, (_, i) => `${i + 1}`);
            expData = Array(daysInMonth).fill(0);
            incData = Array(daysInMonth).fill(0);
            filteredTxs.forEach(t => {
                const date = new Date(t.date).getDate() - 1;
                const amt = parseFloat(t.amount);
                const isIncome = amt < 0 || (t.category && t.category.toLowerCase() === 'add money');
                if (isIncome) incData[date] += Math.abs(amt);
                else expData[date] += amt;
            });
            savData = incData.map((inc, i) => inc - expData[i]);
        } else if (durationType === 'custom') {
            const diffTime = Math.abs(endDate - startDate);
            let numDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (numDays === 0) numDays = 1;
            
            labels = Array.from({length: numDays}, (_, i) => {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                return `${d.getDate()}/${d.getMonth()+1}`;
            });
            expData = Array(numDays).fill(0);
            incData = Array(numDays).fill(0);
            filteredTxs.forEach(t => {
                const tDate = new Date(t.date);
                tDate.setHours(0,0,0,0);
                const start = new Date(startDate);
                start.setHours(0,0,0,0);
                const dayIdx = Math.floor((tDate - start) / (1000 * 60 * 60 * 24));
                if (dayIdx >= 0 && dayIdx < numDays) {
                    const amt = parseFloat(t.amount);
                    const isIncome = amt < 0 || (t.category && t.category.toLowerCase() === 'add money');
                    if (isIncome) incData[dayIdx] += Math.abs(amt);
                    else expData[dayIdx] += amt;
                }
            });
            savData = incData.map((inc, i) => inc - expData[i]);
        }
        

        
        renderDurationTable(filteredTxs);
    }

    function renderDurationTable(txs) {
        const tbody = document.getElementById('duration-transactions-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (txs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #8E9BAE; padding: 20px;">No transactions in this period.</td></tr>';
            return;
        }
        
        // Sort transactions by date descending
        const sortedTxs = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sortedTxs.forEach(t => {
            const tr = document.createElement('tr');
            const dateStr = new Date(t.date).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            const amt = parseFloat(t.amount);
            const isIncome = amt < 0 || (t.category && t.category.toLowerCase() === 'add money');
            const displayAmt = Math.abs(amt).toFixed(2);
            const displaySign = isIncome ? '+' : '';
            const color = isIncome ? '#00E676' : 'var(--text-main)';

            tr.innerHTML = `
                <td>${dateStr}</td>
                <td>${escapeHTML(t.title)}</td>
                <td style="color: ${color}">${displaySign}₹${displayAmt}</td>
                <td>${escapeHTML(t.category)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderTransactionsTable() {
        const tbody = document.getElementById('transactions-tbody');
        tbody.innerHTML = '';
        const activeTxs = state.allTransactions.filter(t => !t.is_deleted);
        activeTxs.forEach(t => {
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
                <td><span style="color: #00E676">Active</span></td>
                <td>
                    <button class="action-btn delete" data-id="${t.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
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
    }

    function renderTrashTable(searchQuery = '') {
        const tbody = document.getElementById('trash-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        let deletedTxs = state.allTransactions.filter(t => t.is_deleted);
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase().trim();
            deletedTxs = deletedTxs.filter(t => 
                (t.category && t.category.toLowerCase().includes(query)) ||
                (t.title && t.title.toLowerCase().includes(query))
            );
        }
        
        if (deletedTxs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #8E9BAE; padding: 20px;">No deleted transactions found.</td></tr>`;
            return;
        }

        deletedTxs.forEach(t => {
            const tr = document.createElement('tr');
            const dateStr = new Date(t.date).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            const amt = parseFloat(t.amount);
            const isIncome = amt < 0 || (t.category && t.category.toLowerCase() === 'add money');
            const displayAmt = Math.abs(amt).toFixed(2);
            const displaySign = isIncome ? '+' : '';
            const color = isIncome ? '#00E676' : 'var(--text-main)';

            tr.innerHTML = `
                <td>${dateStr}</td>
                <td style="text-decoration: line-through; color: #8E9BAE;">${escapeHTML(t.title)}</td>
                <td style="color: ${color}">${displaySign}₹${displayAmt}</td>
                <td>${escapeHTML(t.category)}</td>
                <td><span style="color: #ff3366">Deleted</span></td>
                <td>
                    <button class="action-btn restore" data-id="${t.id}" title="Restore"><i class="fa-solid fa-rotate-left"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Bind events
        document.querySelectorAll('.action-btn.restore').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                await fetch(`/api/transactions/${id}/restore`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }});
                await loadAllTransactions();
                await loadActiveTransactions();
            });
        });
    }

    const trashSearchInput = document.getElementById('trash-search');
    if (trashSearchInput) {
        trashSearchInput.addEventListener('input', (e) => {
            renderTrashTable(e.target.value);
        });
    }

    // --- 6. Expense Handlers ---
    async function handleAddExpense(amount, category, isRefund = false, title = '') {
        if (!amount || isNaN(amount) || amount === 0) {
            alert('Please enter a valid amount.');
            return;
        }
        
        if (category.toLowerCase() === 'add money' && !isRefund) {
            isRefund = true;
        }
        
        const finalAmount = isRefund ? -Math.abs(amount) : Math.abs(amount);
        const finalTitle = title.trim() || (isRefund ? 'Income / Refund' : 'Expense');
        
        try {
            const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title: finalTitle, amount: finalAmount, category: formattedCategory })
            });
            if (response.ok) {
                await loadActiveTransactions();
            } else {
                let errMsg = 'Unknown error';
                try { const errData = await response.json(); errMsg = errData.error || errMsg; } catch(e) {}
                alert('Failed to save transaction: ' + errMsg);
            }
        } catch(err) { console.error(err); }
    }

    const addBtn = document.getElementById('add-expense-btn');
    const refundBtn = document.getElementById('add-refund-btn');

    function processTransaction(isRefund) {
        let amt = parseFloat(document.getElementById('amount').value);
        const cat = document.getElementById('category').value;
        const titleInput = document.getElementById('expense-title');
        const title = titleInput ? titleInput.value : '';
        
        const activeTimeframeBtn = document.querySelector('.timeframe-toggles button.active');
        if (activeTimeframeBtn) {
            const timeframe = activeTimeframeBtn.innerText.toLowerCase();
            if (timeframe === 'week') amt *= 4; 
            else if (timeframe === 'year') amt /= 12; 
        }
        
        handleAddExpense(amt, cat, isRefund, title);
        document.getElementById('amount').value = '';
        if (titleInput) titleInput.value = '';
    }

    if(addBtn) addBtn.addEventListener('click', () => processTransaction(false));
    if(refundBtn) refundBtn.addEventListener('click', () => processTransaction(true));

    // Auto-categorize when user types an item name
    const expenseTitleInput = document.getElementById('expense-title');
    const categorySelect = document.getElementById('category');
    if (expenseTitleInput && categorySelect) {
        expenseTitleInput.addEventListener('input', () => {
            const detected = detectCategory(expenseTitleInput.value);
            if (detected) {
                categorySelect.value = detected;
            }
        });
    }

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
    
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    searchInput.addEventListener('input', debounce(async (e) => {
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
            !t.is_deleted && (
                (t.category && t.category.toLowerCase().includes(query)) ||
                (t.title && t.title.toLowerCase().includes(query))
            )
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
    }, 300));

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

    // Duration Summary Listeners
    const durationBtns = document.querySelectorAll('.duration-toggles button');
    const customDateRow = document.querySelector('.custom-duration-row');
    durationBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            durationBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            if (e.target.dataset.duration === 'custom') {
                customDateRow.style.display = 'flex';
            } else {
                customDateRow.style.display = 'none';
                calculateDurationSummary();
            }
        });
    });

    document.getElementById('calculate-duration-btn')?.addEventListener('click', () => {
        calculateDurationSummary();
    });

    // Analytics Chart Listeners
    const analyticsBtns = document.querySelectorAll('.analytics-toggles button');
    const customAnalyticsRow = document.querySelector('.custom-analytics-row');
    analyticsBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            analyticsBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            if (e.target.dataset.duration === 'custom') {
                customAnalyticsRow.style.display = 'flex';
            } else {
                customAnalyticsRow.style.display = 'none';
                calculateAnalyticsSummary();
            }
        });
    });

    document.getElementById('calculate-analytics-btn')?.addEventListener('click', () => {
        calculateAnalyticsSummary();
    });

    function calculateAnalyticsSummary() {
        const activeBtn = document.querySelector('.analytics-toggles button.active');
        if (!activeBtn) return;
        const durationType = activeBtn.dataset.duration;

        let startDate = new Date();
        let endDate = new Date();
        startDate.setHours(0,0,0,0);
        endDate.setHours(23,59,59,999);

        if (durationType === 'daily') {
            // Keep today
        } else if (durationType === 'weekly') {
            const day = startDate.getDay();
            const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
            startDate.setDate(diff);
        } else if (durationType === 'monthly') {
            startDate.setDate(1);
        } else if (durationType === 'custom') {
            const startVal = document.getElementById('analytics-start').value;
            const endVal = document.getElementById('analytics-end').value;
            if (startVal && endVal) {
                startDate = new Date(startVal);
                startDate.setHours(0,0,0,0);
                endDate = new Date(endVal);
                endDate.setHours(23,59,59,999);
            }
        }

        let labels = [];
        let expData = [];
        let incData = [];
        let savData = [];

        if (durationType === 'daily') {
            labels = Array.from({length: 24}, (_, i) => `${i}:00`);
            expData = Array(24).fill(0);
            incData = Array(24).fill(0);
            state.transactions.forEach(t => {
                const tDate = new Date(t.date);
                if (tDate >= startDate && tDate <= endDate) {
                    const hour = tDate.getHours();
                    const amt = parseFloat(t.amount);
                    const isIncome = amt < 0 || (t.category && t.category.toLowerCase() === 'add money');
                    if (isIncome) incData[hour] += Math.abs(amt);
                    else expData[hour] += amt;
                }
            });
            savData = incData.map((inc, i) => inc - expData[i]);
        } else if (durationType === 'weekly') {
            labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            expData = Array(7).fill(0);
            incData = Array(7).fill(0);
            state.transactions.forEach(t => {
                const tDate = new Date(t.date);
                if (tDate >= startDate && tDate <= endDate) {
                    const day = tDate.getDay();
                    const amt = parseFloat(t.amount);
                    const isIncome = amt < 0 || (t.category && t.category.toLowerCase() === 'add money');
                    if (isIncome) incData[day] += Math.abs(amt);
                    else expData[day] += amt;
                }
            });
            savData = incData.map((inc, i) => inc - expData[i]);
        } else if (durationType === 'monthly') {
            const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
            labels = Array.from({length: daysInMonth}, (_, i) => `${i + 1}`);
            expData = Array(daysInMonth).fill(0);
            incData = Array(daysInMonth).fill(0);
            state.transactions.forEach(t => {
                const tDate = new Date(t.date);
                if (tDate >= startDate && tDate <= endDate) {
                    const date = tDate.getDate() - 1;
                    const amt = parseFloat(t.amount);
                    const isIncome = amt < 0 || (t.category && t.category.toLowerCase() === 'add money');
                    if (isIncome) incData[date] += Math.abs(amt);
                    else expData[date] += amt;
                }
            });
            savData = incData.map((inc, i) => inc - expData[i]);
        } else if (durationType === 'custom') {
            const diffTime = Math.abs(endDate - startDate);
            let numDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (numDays === 0) numDays = 1;
            
            labels = Array.from({length: numDays}, (_, i) => {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                return `${d.getDate()}/${d.getMonth()+1}`;
            });
            expData = Array(numDays).fill(0);
            incData = Array(numDays).fill(0);
            state.transactions.forEach(t => {
                const tDate = new Date(t.date);
                if (tDate >= startDate && tDate <= endDate) {
                    tDate.setHours(0,0,0,0);
                    const start = new Date(startDate);
                    start.setHours(0,0,0,0);
                    const dayIdx = Math.floor((tDate - start) / (1000 * 60 * 60 * 24));
                    if (dayIdx >= 0 && dayIdx < numDays) {
                        const amt = parseFloat(t.amount);
                        const isIncome = amt < 0 || (t.category && t.category.toLowerCase() === 'add money');
                        if (isIncome) incData[dayIdx] += Math.abs(amt);
                        else expData[dayIdx] += amt;
                    }
                }
            });
            savData = incData.map((inc, i) => inc - expData[i]);
        }
        
        const filteredLabels = [];
        const filteredExp = [];
        const filteredInc = [];
        const filteredSav = [];
        
        for (let i = 0; i < labels.length; i++) {
            if (expData[i] !== 0 || incData[i] !== 0) {
                filteredLabels.push(labels[i]);
                filteredExp.push(expData[i]);
                filteredInc.push(incData[i]);
                filteredSav.push(savData[i]);
            }
        }

        // Pad right side with empty values if there are few transactions, so they align to the left
        if (filteredLabels.length > 0 && filteredLabels.length < 8) {
            const padCount = 8 - filteredLabels.length;
            for(let i=0; i < padCount; i++) {
                filteredLabels.push('');
                filteredExp.push(0);
                filteredInc.push(0);
                filteredSav.push(0);
            }
        }

        if (filteredLabels.length > 0) {
            updateChart(filteredLabels, filteredExp, filteredSav, filteredInc);
        } else {
            updateChart(labels, expData, savData, incData);
        }
    }

    // Boot
    await loadProfile();
    await loadActiveTransactions();
    state.allTransactions = state.transactions;
});
