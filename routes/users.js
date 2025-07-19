// routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { protect, adminOnly } = require('../middleware/auth');
const { logAction } = require('../services/auditLog');

// --- ADMIN ONLY: CREATE A NEW USER ---
router.post('/', protect, adminOnly, async (req, res) => {
  const { fullName, email, password, role } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUserQuery = `INSERT INTO Users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id, email, role;`;
    const { rows } = await db.query(newUserQuery, [fullName, email, passwordHash, role]);
    
    await logAction(req.user.id, 'user_created', { newUserId: rows[0].user_id, newUserEmail: rows[0].email });
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating new user.');
  }
});

module.exports = router;