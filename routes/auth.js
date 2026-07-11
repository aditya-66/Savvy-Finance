const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../config/db');

const router = express.Router();

// Email Transporter Config
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendOTP(email, otp) {
    const mailOptions = {
        from: `"SAVVY Finance" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Verification Code - SAVVY',
        html: `<div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; background-color: #0b1120; color: #fff;">
                <h1 style="color: #00E5FF;">SAVVY</h1>
                <p>Welcome! Your verification code is:</p>
                <h2 style="letter-spacing: 5px; font-size: 36px; color: #fff;">${otp}</h2>
                <p style="color: #8E9BAE; font-size: 12px;">This code expires in 10 minutes. Do not share it with anyone.</p>
               </div>`
    };
    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (err) {
        console.error('Email send error:', err);
        return false;
    }
}


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
            console.error('Auth DB Error:', dbErr);
            res.sendStatus(500);
        }
    });
};

const isValidString = (val, maxLen) => typeof val === 'string' && val.trim().length > 0 && val.length <= maxLen;

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    
    if (!isValidString(name, 100) || !isValidString(email, 255) || !isValidString(password, 255)) {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    try {
        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + 10 * 60000); // 10 mins from now

        await db.query(
            'INSERT INTO users (name, email, password, is_verified, otp, otp_expires) VALUES (?, ?, ?, ?, ?, ?)', 
            [name, email, hashedPassword, false, otp, otpExpires]
        );
        
        // Send email silently in background (or wait for it, depending on reliability needs)
        sendOTP(email, otp);

        res.status(201).json({ message: 'User registered successfully. Please verify email.', action: 'REDIRECT_TO_VERIFICATION' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!isValidString(email, 255) || !isValidString(password, 255)) {
        return res.status(400).json({ error: 'Invalid input data' });
    }

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

        // Check verification
        if (!user.is_verified) {
            const otp = crypto.randomInt(100000, 999999).toString();
            const otpExpires = new Date(Date.now() + 10 * 60000);
            await db.query('UPDATE users SET otp = ?, otp_expires = ? WHERE id = ?', [otp, otpExpires, user.id]);
            sendOTP(email, otp);
            
            return res.status(403).json({ 
                error: 'Email not verified', 
                action: 'REDIRECT_TO_VERIFICATION' 
            });
        }

        const token = jwt.sign({ id: user.id, name: user.name }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, name: user.name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    
    if (!isValidString(email, 255) || !isValidString(otp, 10)) {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const user = users[0];
        if (user.is_verified) {
            return res.status(400).json({ error: 'User already verified' });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        if (new Date() > new Date(user.otp_expires)) {
            return res.status(400).json({ error: 'Verification code expired. Please request a new one.' });
        }

        // Success: Mark as verified and clear OTP
        await db.query('UPDATE users SET is_verified = TRUE, otp = NULL, otp_expires = NULL WHERE id = ?', [user.id]);

        // Auto-login
        const token = jwt.sign({ id: user.id, name: user.name }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ message: 'Email verified successfully', token, name: user.name });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/resend-otp', async (req, res) => {
    const { email } = req.body;
    
    if (!isValidString(email, 255)) {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const user = users[0];
        if (user.is_verified) {
            return res.status(400).json({ error: 'User already verified' });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + 10 * 60000);
        await db.query('UPDATE users SET otp = ?, otp_expires = ? WHERE id = ?', [otp, otpExpires, user.id]);
        
        sendOTP(email, otp);
        res.json({ message: 'Verification code resent successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user profile and budget
router.get('/me', authenticate, async (req, res) => {
    try {
        const [users] = await db.query('SELECT name, email, created_at, monthly_budget, target_savings, emergency_fund_target, fixed_needs, misc_buffer_pct, discretionary_categories FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(users[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update budget and savings goals
router.post('/budget', authenticate, async (req, res) => {
    const { budget, savings, emergency_fund, fixed_needs, misc_buffer, discretionary_categories } = req.body;
    
    const pBudget = parseFloat(budget) || 0;
    const pSavings = parseFloat(savings) || 0;
    const pEmergency = parseFloat(emergency_fund) || 0;
    const pFixed = parseFloat(fixed_needs) || 0;
    const pMisc = parseFloat(misc_buffer) || 0;

    if (pBudget < 0 || pSavings < 0 || pEmergency < 0 || pFixed < 0 || pMisc < 0 || pMisc > 100) {
        return res.status(400).json({ error: 'Invalid budget parameters' });
    }

    try {
        let discrCats = (Array.isArray(discretionary_categories) && discretionary_categories.length <= 50) ? JSON.stringify(discretionary_categories.map(String).map(s => s.trim().substring(0,50))) : null;
        await db.query(
            'UPDATE users SET monthly_budget = ?, target_savings = ?, emergency_fund_target = ?, fixed_needs = ?, misc_buffer_pct = ?, discretionary_categories = ? WHERE id = ?', 
            [pBudget, pSavings, pEmergency, pFixed, pMisc, discrCats, req.user.id]
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
        // Explicitly delete transactions first in case ON DELETE CASCADE is missing in the user's local DB schema
        await db.query('DELETE FROM transactions WHERE user_id = ?', [req.user.id]);
        // Delete the user
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
