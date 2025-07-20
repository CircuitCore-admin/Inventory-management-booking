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
      INSERT INTO Users (full_name, email, password_hash, role, created_at, is_active)
      VALUES ($1, $2, $3, $4, NOW(), TRUE) RETURNING user_id, email, role, full_name, is_active;
    `;
    const { rows } = await db.query(newUserQuery, [fullName, email, passwordHash, role]);
    const newUser = rows[0];

    await logAction(req.user.id, req.user.full_name, 'user_created', { newUserId: newUser.user_id, newUserEmail: newUser.email, newUserRole: newUser.role });

    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // PostgreSQL unique violation error code
        return res.status(400).json({ msg: 'User with this email already exists.' });
    }
    res.status(500).send('Error creating new user.');
  }
});

// GET all users (or filter by role and active status) - Modified to include is_active
// GET all users (or filter by role and active status)
// Changed to adminOnly if only Admins should see the full user list
router.get('/', protect, adminOnly, async (req, res) => { // CHANGED authorize to adminOnly
  const { role, includeInactive } = req.query; // includeInactive can be 'true' to show all
  try {
    let query = 'SELECT user_id, full_name, email, role, is_active FROM Users'; // Explicitly select is_active
    const params = [];

    let whereClauses = [];
    if (role) {
      whereClauses.push(`role = $${params.length + 1}`);
      params.push(role);
    }
    // If includeInactive is not 'true' (i.e., it's undefined or 'false'), only show active users
    if (includeInactive !== 'true') {
        whereClauses.push(`is_active = TRUE`);
    }

    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
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
    // Check only active users for duplication when creating new
    const { rows } = await db.query('SELECT 1 FROM Users WHERE email = $1 AND is_active = TRUE', [email]);
    if (rows.length > 0) {
      return res.json({ exists: true, msg: 'Email address is already in use by an active account.' });
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
  const { fullName, email, password, role, is_active } = req.body; // Added is_active to allow updating it
  
  try {
    let updateFields = [];
    const params = [];
    let paramIndex = 1;

    if (fullName !== undefined) {
      updateFields.push(`full_name = $${paramIndex++}`);
      params.push(fullName);
    }
    if (email !== undefined) {
      // Check for duplicate email if email is being updated and it's not the current user's email
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
    if (password) { // Only hash and update password if a new password is provided
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      updateFields.push(`password_hash = $${paramIndex++}`);
      params.push(passwordHash);
    }
    if (is_active !== undefined) { // Allow updating active status
        updateFields.push(`is_active = $${paramIndex++}`);
        params.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ msg: 'No fields provided for update.' });
    }

    params.push(userId); // Add userId for the WHERE clause
    const updateUserQuery = `
      UPDATE Users SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex} RETURNING user_id, full_name, email, role, is_active;
    `;

    const { rows } = await db.query(updateUserQuery, params);

    if (rows.length === 0) {
      return res.status(404).json({ msg: 'User not found.' });
    }
    
    await logAction(req.user.id, req.user.full_name, 'user_updated', { updatedUserId: userId, changes: req.body });

    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    if (err.code === '23505') { // PostgreSQL unique violation error code
        return res.status(400).json({ msg: 'User with this email already exists.' });
    }
    res.status(500).send('Server Error');
  }
});

// Disable (instead of delete) a user by ID with admin password confirmation
// We keep this as a DELETE method for RESTful consistency, but it performs an UPDATE internally.
router.delete('/:userId', protect, adminOnly, async (req, res) => {
  const { userId } = req.params;
  const { adminPassword } = req.body; // Password of the currently logged-in admin

  if (!adminPassword) {
    return res.status(400).json({ msg: 'Admin password is required for deactivation.' });
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

    // 2. Prevent admin from deactivating their own account
    if (req.user.id === parseInt(userId, 10)) {
        return res.status(400).json({ msg: 'Cannot deactivate your own account.' });
    }

    // 3. Update the user's status to inactive instead of deleting
    const deactivateUserQuery = 'UPDATE Users SET is_active = FALSE WHERE user_id = $1 RETURNING user_id, full_name, email, is_active;';
    const { rows } = await db.query(deactivateUserQuery, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ msg: 'User not found or already inactive.' });
    }

    const deactivatedUser = rows[0];
    await logAction(req.user.id, req.user.full_name, 'user_deactivated', { deactivatedUserId: deactivatedUser.user_id, deactivatedUserEmail: deactivatedUser.email, deactivatedUserName: deactivatedUser.full_name });

    res.json({ msg: 'User deactivated successfully', deactivatedUser: deactivatedUser });
  } catch (err) {
    console.error('Error deactivating user:', err);
    res.status(500).send('Server Error');
  }
});

// NEW: Activate a user by ID with admin password confirmation (similar to deactivation)
router.put('/:userId/activate', protect, adminOnly, async (req, res) => {
  const { userId } = req.params;
  const { adminPassword } = req.body;

  if (!adminPassword) {
    return res.status(400).json({ msg: 'Admin password is required for activation.' });
  }

  try {
    const adminUserResult = await db.query('SELECT password_hash FROM Users WHERE user_id = $1', [req.user.id]);
    if (adminUserResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Logged-in admin user not found.' });
    }
    const isMatch = await bcrypt.compare(adminPassword, adminUserResult.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Incorrect password for admin account.' });
    }

    const activateUserQuery = 'UPDATE Users SET is_active = TRUE WHERE user_id = $1 RETURNING user_id, full_name, email, is_active;';
    const { rows } = await db.query(activateUserQuery, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ msg: 'User not found or already active.' });
    }

    const activatedUser = rows[0];
    await logAction(req.user.id, req.user.full_name, 'user_activated', { activatedUserId: activatedUser.user_id, activatedUserEmail: activatedUser.email, activatedUserName: activatedUser.full_name });

    res.json({ msg: 'User activated successfully', activatedUser: activatedUser });
  } catch (err) {
    console.error('Error activating user:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;