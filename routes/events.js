// routes/events.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, adminOnly } = require('../middleware/auth');
const { logAction } = require('../services/auditLog');

// --- GET ALL EVENTS ---
router.get('/', protect, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM Events ORDER BY start_date DESC');
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- CREATE NEW EVENT ---
router.post('/', protect, adminOnly, async (req, res) => {
  const { name, location, start_date, end_date } = req.body;
  try {
    const newEventQuery = `INSERT INTO Events (name, location, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *;`;
    const { rows } = await db.query(newEventQuery, [name, location, start_date, end_date]);
    
    await logAction(req.user.id, 'event_created', { eventId: rows[0].event_id, eventName: rows[0].name });
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- GET SINGLE EVENT BY ID ---
router.get('/:id', protect, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM Events WHERE event_id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- UPDATE EVENT ---
router.put('/:id', protect, adminOnly, async (req, res) => {
  const { name, location, start_date, end_date } = req.body;
  try {
    const updateQuery = `UPDATE Events SET name = $1, location = $2, start_date = $3, end_date = $4 WHERE event_id = $5 RETURNING *;`;
    const { rows } = await db.query(updateQuery, [name, location, start_date, end_date, req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    await logAction(req.user.id, 'event_updated', { eventId: req.params.id, newName: rows[0].name });
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- DELETE EVENT ---
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query('DELETE FROM Events WHERE event_id = $1 RETURNING *', [req.params.id]);
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