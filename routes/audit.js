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
    // Modified to select is_active
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

    // UPDATED CALL: Pass req.user.full_name - This logAction here needs to be re-evaluated
    // as it's outside a protected route and req.user might not be available yet.
    // For now, let's pass user.full_name directly.
    await logAction(user.user_id, user.full_name, 'user_login', { email: user.email });

    const payload = {
      user: {
        id: user.user_id,
        role: user.role,
        full_name: user.full_name
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
// ... (OTP generation and login routes - no changes needed for is_active unless you want to disable OTP for inactive users)
// For OTP login, you might want to add:
// if (!user.is_active && user.role !== 'contractor') { // Allow inactive contractors if that's desired for events
//     return res.status(403).send('Account is disabled.');
// }
// Or strictly: if (!user.is_active) { return res.status(403).send('Account is disabled.'); }

module.exports = router;