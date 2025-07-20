// williams-inventory/routes/audit.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, adminOnly } = require('../middleware/auth');

// Keep audit logs as adminOnly for raw access
router.get('/', protect, adminOnly, async (req, res) => {
    try {
        const query = `
            SELECT 
                a.log_id, 
                a.action, 
                a.details, 
                a.created_at, 
                a.user_id, -- Keep the original user_id (actor's ID)
                a.actor_full_name -- Display this name
            FROM Audit_Logs a
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