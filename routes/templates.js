// routes/templates.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, authorize } = require('../middleware/auth');
const { logAction } = require('../services/auditLog');

// --- GET ALL TEMPLATES ---
router.get('/', protect, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM Templates ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- CREATE NEW TEMPLATE (Admins/Managers, expandable) ---
router.post('/', protect, authorize('admin', 'management'), async (req, res) => {
    const { name, description, itemIds } = req.body; // itemIds is an array like [1, 5, 12]
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Step 1: Create the template
        const newTemplateQuery = 'INSERT INTO Templates (name, description, created_by_user_id) VALUES ($1, $2, $3) RETURNING *;';
        const templateResult = await client.query(newTemplateQuery, [name, description, req.user.id]);
        const newTemplate = templateResult.rows[0];

        // Step 2: Link items to the template
        if (itemIds && itemIds.length > 0) {
            const itemInsertQuery = 'INSERT INTO Template_Items (template_id, item_id) VALUES ($1, $2)';
            for (const itemId of itemIds) {
                await client.query(itemInsertQuery, [newTemplate.template_id, itemId]);
            }
        }
        
        await client.query('COMMIT');
        
        await logAction(req.user.id, 'template_created', { templateId: newTemplate.template_id, name });
        
        res.status(201).json(newTemplate);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

module.exports = router;