// routes/audit.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, adminOnly, async (req, res) => {
    try {
        const query = `
            SELECT a.log_id, a.action, a.details, a.created_at, u.full_name, u.email 
            FROM Audit_Logs a
            JOIN Users u ON a.user_id = u.user_id
            ORDER BY a.created_at DESC;
        `;
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;