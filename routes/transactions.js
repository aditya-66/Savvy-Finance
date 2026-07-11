const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();

// Middleware to verify JWT token
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) return res.sendStatus(403);
        
        try {
            // Verify user still exists in database
            const [users] = await db.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
            if (users.length === 0) {
                return res.sendStatus(401); // User was deleted
            }
            req.user = users[0];
            next();
        } catch (dbErr) {
            console.error('Transactions Auth DB Error:', dbErr);
            res.sendStatus(500);
        }
    });
};

router.use(authenticate);

// Get active transactions for dashboard calculations
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM transactions WHERE user_id = ? AND is_deleted = FALSE ORDER BY date DESC', [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add a transaction
router.post('/', async (req, res) => {
    let { title, amount, category } = req.body;
    
    // Security Validation
    if (typeof title !== 'string' || title.trim().length === 0 || title.length > 255) {
        return res.status(400).json({ error: 'Invalid title' });
    }
    if (typeof category !== 'string' || category.trim().length === 0 || category.length > 50) {
        return res.status(400).json({ error: 'Invalid category' });
    }
    const parsedAmount = parseFloat(amount);
    if (!isFinite(parsedAmount) || parsedAmount > 999999999 || parsedAmount < -999999999) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO transactions (user_id, title, amount, category) VALUES (?, ?, ?, ?)',
            [req.user.id, title.trim(), parsedAmount, category.trim()]
        );
        res.status(201).json({ id: result.insertId, title: title.trim(), amount: parsedAmount, category: category.trim() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get ALL transactions (including deleted) for History Table
router.get('/all', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC', [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Soft delete a transaction
router.delete('/:id', async (req, res) => {
    try {
        await db.query('UPDATE transactions SET is_deleted = TRUE WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Transaction soft deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Restore a soft-deleted transaction
router.post('/:id/restore', async (req, res) => {
    try {
        await db.query('UPDATE transactions SET is_deleted = FALSE WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Transaction restored' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
