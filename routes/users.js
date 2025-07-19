// routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { protect, adminOnly, authorize } = require('../middleware/auth');
const { logAction } = require('../services/auditLog');

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

// GET all users (or filter by role)
router.get('/', protect, authorize('admin', 'management'), async (req, res) => {
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

// Check if email already exists (for real-time validation)
router.get('/check-email', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ msg: 'Email query parameter is required.' });
  }

  try {
    const { rows } = await db.query('SELECT 1 FROM Users WHERE email = $1', [email]);
    if (rows.length > 0) {
      return res.json({ exists: true, msg: 'Email address is already in use.' });
    }
    res.json({ exists: false });
  } catch (err) {
    console.error('Error checking email:', err);
    res.status(500).send('Server Error');
  }
});

// Update a user by ID
router.put('/:userId', protect, adminOnly, async (req, res) => {
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
      if (email) {
          const existingUserCheck = await db.query('SELECT user_id FROM Users WHERE email = $1 AND user_id != $2', [email, userId]);
          if (existingUserCheck.rows.length > 0) {
              return res.status(400).json({ msg: 'Another user with this email already exists.' });
          }
      }
      updateFields.push(`email = $${paramIndex++}`);
      params.push(email);
    }
    if (role !== undefined) {
      updateFields.push(`role = $${paramIndex++}`);
      params.push(role);
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      updateFields.push(`password_hash = $${paramIndex++}`);
      params.push(passwordHash);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ msg: 'No fields provided for update.' });
    }

    params.push(userId);
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
    if (err.code === '23505') {
        return res.status(400).json({ msg: 'User with this email already exists.' });
    }
    res.status(500).send('Server Error');
  }
});

// NEW: Delete a user by ID with admin password confirmation
router.delete('/:userId', protect, adminOnly, async (req, res) => {
  const { userId } = req.params;
  const { adminPassword } = req.body; // Password of the currently logged-in admin

  if (!adminPassword) {
    return res.status(400).json({ msg: 'Admin password is required for deletion.' });
  }

  try {
    // 1. Verify the logged-in admin's password
    const adminUserResult = await db.query('SELECT password_hash FROM Users WHERE user_id = $1', [req.user.id]);
    if (adminUserResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Logged-in admin user not found.' });
    }
    const isMatch = await bcrypt.compare(adminPassword, adminUserResult.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Incorrect password for admin account.' });
    }

    // 2. Prevent admin from deleting their own account (optional, but good practice)
    if (req.user.id === parseInt(userId, 10)) {
        return res.status(400).json({ msg: 'Cannot delete your own account.' });
    }

    // 3. Delete the specified user
    const deleteUserQuery = 'DELETE FROM Users WHERE user_id = $1 RETURNING user_id, full_name, email;';
    const { rows } = await db.query(deleteUserQuery, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    const deletedUser = rows[0];
    await logAction(req.user.id, 'user_deleted', { deletedUserId: deletedUser.user_id, deletedUserEmail: deletedUser.email, deletedUserName: deletedUser.full_name });

    res.json({ msg: 'User deleted successfully', deletedUser: deletedUser });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;