// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Ensure crypto is available if OTP routes are in this file
const db = require('../db');
const { logAction } = require('../services/auditLog');
const { protect, adminOnly } = require('../middleware/auth'); // ensure protect and adminOnly are here if used by OTP routes

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Modified to explicitly select is_active
    const userQuery = 'SELECT user_id, email, password_hash, role, full_name, is_active FROM Users WHERE email = $1';
    const { rows } = await db.query(userQuery, [email]);
    
    if (rows.length === 0) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const user = rows[0];

    // NEW: Check if user is active
    if (!user.is_active) {
        return res.status(403).json({ msg: 'Account is disabled. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // UPDATED CALL: Pass user.full_name for the actor
    await logAction(user.user_id, user.full_name, 'user_login', { email: user.email });

    const payload = {
      user: {
        id: user.user_id,
        role: user.role,
        full_name: user.full_name // NEW: Include full_name in the JWT payload
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }, // Token expires in 1 hour
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// --- ADMIN GENERATES OTP FOR A CONTRACTOR ---
// (Ensure protect and adminOnly middleware are correctly imported at the top)
router.post('/otp/generate', protect, adminOnly, async (req, res) => {
  // Now accepts a specific expiry timestamp from the date/time selector
  const { userId, eventId, sessionExpiresAt } = req.body; 
  
  const otp = crypto.randomInt(100000, 999999).toString();
  
  try {
    // Validate if the contractorUserId exists and has the 'contractor' role, and is active
    const userResult = await db.query('SELECT role, is_active FROM Users WHERE user_id = $1', [userId]);
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'contractor' || !userResult.rows[0].is_active) {
      return res.status(404).json({ msg: 'Contractor user not found or not active.' });
    }

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

    // UPDATED CALL: logAction (req.user.full_name should be available from protect middleware)
    await logAction(req.user.id, req.user.full_name, 'otp_generated', { otpUserId: userId, eventId });

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
    // Modified to select is_active and ensure role is contractor
    const userResult = await db.query('SELECT user_id, email, role, full_name, is_active FROM Users WHERE email = $1 AND role = \'contractor\'', [email]);
    if (userResult.rows.length === 0) return res.status(400).send('Invalid credentials.');
    
    const user = userResult.rows[0];

    // NEW: Check if contractor is active
    if (!user.is_active) {
      return res.status(403).json({ msg: 'Account is disabled. Please contact support.' });
    }

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
    // UPDATED CALL: logAction (use user.full_name as it's the logging-in user)
    await logAction(user.user_id, user.full_name, 'user_otp_login', { email: user.email });

    const payload = {
      user: {
        id: user.user_id,
        role: user.role,
        isOtpSession: true,
        eventId: storedOtp.event_id,
        full_name: user.full_name // Include full_name for OTP session
      },
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