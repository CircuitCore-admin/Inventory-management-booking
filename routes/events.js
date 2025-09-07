// routes/events.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, adminOnly, authorize } = require('../middleware/auth');
const { logAction } = require('../services/auditLog');

// --- GET ALL APPROVED EVENTS for the calendar ---
router.get('/', protect, async (req, res) => {
  try {
    // Note: We only get approved events for the main calendar view.
    const { rows } = await db.query("SELECT * FROM events WHERE status = 'approved' ORDER BY start_date DESC");
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- GET A SINGLE EVENT BY ITS ID ---
router.get('/:eventId', protect, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM events WHERE event_id = $1', [req.params.eventId]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// NEW ROUTE: GET all allocated items for a specific event
router.get('/:eventId/allocated-items', protect, async (req, res) => {
  try {
    const query = `
            SELECT ii.unique_identifier AS item_id, ii.name, ii.category
            FROM allocated_items ai
            JOIN inventory_items ii ON ai.item_id = ii.item_id
            WHERE ai.event_id = $1
            ORDER BY ii.name;
        `;
    // The query returns `item_id`, which is the unique identifier for the inventory item itself, not a general database ID for the booking record.
    const { rows } = await db.query(query, [req.params.eventId]);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch allocated items:', err.message);
    res.status(500).send('Server Error');
  }
});

// --- UPDATE AN EXISTING EVENT ---
// Note: This uses /:id, which is fine as long as it's the only one.
router.put('/:id', protect, authorize('admin', 'management'), async (req, res) => {
  const { name, location, start_date, end_date } = req.body;
  try {
    const updateQuery = `UPDATE events SET name = $1, location = $2, start_date = $3, end_date = $4 WHERE event_id = $5 RETURNING *;`;
    const { rows } = await db.query(updateQuery, [name, location, start_date, end_date, req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    await logAction(req.user.id, 'event_updated', { eventId: req.params.id, eventName: rows[0].name });
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- DELETE AN EVENT ---
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query('DELETE FROM events WHERE event_id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    await logAction(req.user.id, 'event_deleted', { eventId: req.params.id, eventName: rows[0].name });
    res.json({ msg: `Event '${rows[0].name}' was deleted.` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;