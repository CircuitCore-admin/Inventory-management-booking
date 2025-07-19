// routes/users.js
const express = require('express');
const router = express.Router();
const { logAction } = require('../services/auditLog');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { protect, adminOnly, authorize } = require('../middleware/auth'); // Ensure 'authorize' is imported

// --- ADMIN ONLY: CREATE A NEW USER ---
router.post('/', protect, adminOnly, async (req, res) => {
  const { fullName, email, password, role } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUserQuery = `
      INSERT INTO Users (full_name, email, password_hash, role) 
      VALUES ($1, $2, $3, $4) RETURNING user_id, email, role, full_name;
    `;
    const { rows } = await db.query(newUserQuery, [fullName, email, passwordHash, role]);
    const newUser = rows[0];

    await logAction(req.user.id, 'user_created', { newUserId: newUser.user_id, newUserEmail: newUser.email, newUserRole: newUser.role });

    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // PostgreSQL unique violation error code
        return res.status(400).json({ msg: 'User with this email already exists.' });
    }
    res.status(500).send('Error creating new user.');
  }
});

// NEW: Get all users (or filter by role)
router.get('/', protect, authorize('admin', 'management'), async (req, res) => { // Only admins and management can view all users
  const { role } = req.query; 
  try {
    let query = 'SELECT user_id, full_name, email, role FROM Users';
    const params = [];

    if (role) {
      query += ' WHERE role = $1';
      params.push(role);
    }
    query += ' ORDER BY full_name';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).send('Server Error');
  }
});

// NEW: Update a user by ID
router.put('/:userId', protect, adminOnly, async (req, res) => { // Only admins can update users
  const { userId } = req.params;
  const { fullName, email, password, role } = req.body;
  
  try {
    let updateFields = [];
    const params = [];
    let paramIndex = 1;

    if (fullName !== undefined) {
      updateFields.push(`full_name = $${paramIndex++}`);
      params.push(fullName);
    }
    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      params.push(email);
    }
    if (role !== undefined) {
      updateFields.push(`role = $${paramIndex++}`);
      params.push(role);
    }
    if (password) { // Only hash and update password if provided
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      updateFields.push(`password_hash = $${paramIndex++}`);
      params.push(passwordHash);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ msg: 'No fields provided for update.' });
    }

    params.push(userId); // Add userId for the WHERE clause
    const updateUserQuery = `
      UPDATE Users SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex} RETURNING user_id, full_name, email, role;
    `;

    const { rows } = await db.query(updateUserQuery, params);

    if (rows.length === 0) {
      return res.status(404).json({ msg: 'User not found.' });
    }
    
    await logAction(req.user.id, 'user_updated', { updatedUserId: userId, changes: req.body });

    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    if (err.code === '23505') { // PostgreSQL unique violation error code
        return res.status(400).json({ msg: 'User with this email already exists.' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;