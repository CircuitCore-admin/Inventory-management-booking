// routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { protect, adminOnly } = require('../middleware/auth');
const { logAction } = require('../services/auditLog');

// --- ADMIN ONLY: CREATE A NEW USER ---
router.post('/', protect, adminOnly, async (req, res) => { // Comment this out
// router.post('/', async (req, res) => { // Your temporary, unsecured route
  const { fullName, email, password, role } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUserQuery = `
      INSERT INTO Users (full_name, email, password_hash, role) 
      VALUES ($1, $2, $3, $4) RETURNING user_id, email, role;
    `;
    const { rows } = await db.query(newUserQuery, [fullName, email, passwordHash, role]);
    const newUser = rows[0];

    // FIX: Log the action as being performed by the NEW user.
    await logAction(newUser.user_id, 'user_created', { newUserEmail: newUser.email });

    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating new user.');
  }
});

module.exports = router;