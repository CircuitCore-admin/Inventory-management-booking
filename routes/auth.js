// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { logAction } = require('../services/auditLog');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log(`[${new Date().toLocaleTimeString()}] 1. Login attempt for: ${email}`);
    
    const userQuery = 'SELECT * FROM Users WHERE email = $1';
    const { rows } = await db.query(userQuery, [email]);
    
    console.log(`[${new Date().toLocaleTimeString()}] 2. Database query finished.`); // You will NOT see this message

    if (rows.length === 0) return res.status(400).send('Invalid credentials.');
    
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).send('Invalid credentials.');

    await logAction(user.user_id, 'user_login', { email: user.email });

    const payload = { user: { id: user.user_id, role: user.role } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});
// --- ADMIN GENERATES OTP FOR A CONTRACTOR ---
router.post('/otp/generate', protect, adminOnly, async (req, res) => {
  // Now accepts a specific expiry timestamp from the date/time selector
  const { userId, eventId, sessionExpiresAt } = req.body; 
  
  const otp = crypto.randomInt(100000, 999999).toString();
  
  try {
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);
    const otpExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // OTP is still valid for 1 hour

    // Store the hashed OTP and the exact session expiry timestamp
    const query = `
      INSERT INTO One_Time_Passwords (user_id, event_id, otp_hash, expires_at, session_expires_at) 
      VALUES ($1, $2, $3, $4, $5);
    `;
    // Use a default of 24 hours from now if no expiry is provided
    const sessionExpiry = sessionExpiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.query(query, [userId, eventId, otpHash, otpExpiresAt, sessionExpiry]);

    res.json({ otp });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// --- CONTRACTOR LOGS IN WITH OTP ---
router.post('/otp/login', async (req, res) => {
  const { email, otp } = req.body;
  try {
    const userResult = await db.query('SELECT * FROM Users WHERE email = $1 AND role = \'contractor\'', [email]);
    if (userResult.rows.length === 0) return res.status(400).send('Invalid credentials.');
    
    const user = userResult.rows[0];
    const otpResult = await db.query('SELECT * FROM One_Time_Passwords WHERE user_id = $1 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1', [user.user_id]);
    if (otpResult.rows.length === 0) return res.status(400).send('No valid OTP found for this user.');
    
    const storedOtp = otpResult.rows[0];
    const isMatch = await bcrypt.compare(otp, storedOtp.otp_hash);
    if (!isMatch) return res.status(400).send('Invalid OTP.');

    // Check if the session expiry date has already passed
    const sessionExpiresAt = new Date(storedOtp.session_expires_at);
    if (sessionExpiresAt < new Date()) {
      return res.status(400).send('The access period for this OTP has expired.');
    }

    await db.query('DELETE FROM One_Time_Passwords WHERE otp_id = $1', [storedOtp.otp_id]);
    await logAction(user.user_id, 'user_otp_login', { email: user.email });

    const payload = {
      user: { id: user.user_id, role: user.role, isOtpSession: true, eventId: storedOtp.event_id },
    };
    
    // Calculate the remaining lifetime in seconds for the token
    const expiresInSeconds = Math.floor((sessionExpiresAt - new Date()) / 1000);
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: expiresInSeconds }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;