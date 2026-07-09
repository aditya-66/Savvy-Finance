const express = require('express');
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
    const { title, amount, category } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO transactions (user_id, title, amount, category) VALUES (?, ?, ?, ?)',
            [req.user.id, title, amount, category]
        );
        res.status(201).json({ id: result.insertId, title, amount, category });
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
