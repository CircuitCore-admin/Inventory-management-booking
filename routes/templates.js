// williams-inventory/routes/templates.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, adminOnly, authorize } = require('../middleware/auth');
const { logAction } = require('../services/auditLog');

// Get all templates
router.get('/', protect, authorize('admin', 'management', 'event_team'), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM Templates ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Create a new template
router.post('/', protect, authorize('admin', 'management', 'event_team'), async (req, res) => {
  const { name, description } = req.body;
  try {
    const newTemplateQuery = `
      INSERT INTO Templates (name, description, created_by_user_id)
      VALUES ($1, $2, $3) RETURNING *;
    `;
    const { rows } = await db.query(newTemplateQuery, [name, description, req.user.id]);
    await logAction(req.user.id, req.user.full_name, 'template_created', { templateId: rows[0].template_id, templateName: rows[0].name });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    if (err.code === '23505') { // unique_violation for name
      return res.status(400).json({ msg: 'Template name already exists.' });
    }
    res.status(500).send('Server Error');
  }
});

// Get single template by ID
router.get('/:id', protect, authorize('admin', 'management', 'event_team'), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM Templates WHERE template_id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Template not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update template
router.put('/:id', protect, authorize('admin', 'management'), async (req, res) => { // Event Team usually doesn't update others' templates
  const { name, description } = req.body;
  try {
    const updateQuery = `
      UPDATE Templates SET name = $1, description = $2 WHERE template_id = $3 RETURNING *;
    `;
    const { rows } = await db.query(updateQuery, [name, description, req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Template not found' });
    }
    await logAction(req.user.id, req.user.full_name, 'template_updated', { templateId: req.params.id, templateName: rows[0].name });
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    if (err.code === '23505') {
      return res.status(400).json({ msg: 'Template name already exists.' });
    }
    res.status(500).send('Server Error');
  }
});

// Delete template
router.delete('/:id', protect, adminOnly, async (req, res) => { // Admin only for deletion
  try {
    const { rows } = await db.query('DELETE FROM Templates WHERE template_id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Template not found' });
    }
    await logAction(req.user.id, req.user.full_name, 'template_deleted', { templateId: req.params.id, templateName: rows[0].name });
    res.json({ msg: `Template '${rows[0].name}' deleted successfully.` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;