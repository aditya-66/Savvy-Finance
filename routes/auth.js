const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();

// Middleware to verify JWT token
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);
        
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, name: user.name }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, name: user.name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user profile and budget
router.get('/me', authenticate, async (req, res) => {
    try {
        const [users] = await db.query('SELECT name, email, created_at, monthly_budget, target_savings, emergency_fund_target, fixed_needs, misc_buffer_pct FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(users[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update budget and savings goals
router.post('/budget', authenticate, async (req, res) => {
    const { budget, savings, emergency_fund, fixed_needs, misc_buffer } = req.body;
    try {
        await db.query(
            'UPDATE users SET monthly_budget = ?, target_savings = ?, emergency_fund_target = ?, fixed_needs = ?, misc_buffer_pct = ? WHERE id = ?', 
            [budget, savings, emergency_fund || 0, fixed_needs || 0, misc_buffer || 0, req.user.id]
        );
        res.json({ message: 'Budget updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete account
router.delete('/account', authenticate, async (req, res) => {
    try {
        // transactions are deleted via ON DELETE CASCADE in the DB
        await db.query('DELETE FROM users WHERE id = ?', [req.user.id]);
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Generate Telegram Linking Token
router.post('/telegram-token', authenticate, async (req, res) => {
    try {
        const crypto = require('crypto');
        const token = 'SAVVY-' + crypto.randomBytes(3).toString('hex').toUpperCase();
        
        await db.query('UPDATE users SET linking_token = ? WHERE id = ?', [token, req.user.id]);
        res.json({ token, message: 'Linking token generated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
