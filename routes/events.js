// routes/events.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, adminOnly, authorize } = require('../middleware/auth');
const { logAction } = require('../services/auditLog');
const crypto = require('crypto'); // Ensure crypto is imported
const bcrypt = require('bcryptjs'); // Ensure bcryptjs is imported

// --- GET ALL EVENTS ---
router.get('/', protect, authorize('admin', 'management', 'event_team', 'warehouse'), async (req, res) => { // Added authorize middleware
  try {
    const { rows } = await db.query('SELECT * FROM Events ORDER BY start_date DESC');
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- CREATE NEW EVENT ---
router.post('/', protect, adminOnly, async (req, res) => { // Keep adminOnly for event creation
  const { name, location, start_date, end_date } = req.body;
  try {
    const newEventQuery = `INSERT INTO Events (name, location, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *;`;
    const { rows } = await db.query(newEventQuery, [name, location, start_date, end_date]);
    
    // UPDATED CALL: Pass req.user.full_name
    await logAction(req.user.id, req.user.full_name, 'event_created', { eventId: rows[0].event_id, eventName: rows[0].name });
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- GET SINGLE EVENT BY ID ---
router.get('/:id', protect, authorize('admin', 'management', 'event_team', 'warehouse'), async (req, res) => { // Added authorize
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
router.put('/:id', protect, adminOnly, async (req, res) => { // Kept adminOnly
  const { name, location, start_date, end_date } = req.body;
  try {
    const updateQuery = `UPDATE Events SET name = $1, location = $2, start_date = $3, end_date = $4 WHERE event_id = $5 RETURNING *;`;
    const { rows } = await db.query(updateQuery, [name, location, start_date, end_date, req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    // UPDATED CALL: Pass req.user.full_name
    await logAction(req.user.id, req.user.full_name, 'event_updated', { eventId: req.params.id, eventName: rows[0].name });
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- DELETE EVENT ---
router.delete('/:id', protect, adminOnly, async (req, res) => { // Kept adminOnly
  try {
    // If you want to strictly keep related bookings/etc. when an event is deleted,
    // and not have FKs (similar to users), you would remove the FK.
    // If you want ON DELETE SET NULL, you would alter the FK.
    // For now, assuming DELETE actually deletes.
    const { rows } = await db.query('DELETE FROM Events WHERE event_id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    // UPDATED CALL: Pass req.user.full_name
    await logAction(req.user.id, req.user.full_name, 'event_deleted', { eventId: req.params.id, eventName: rows[0].name });
    res.json({ msg: `Event '${rows[0].name}' deleted successfully.` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Assuming OTP routes from previous conversation are integrated into auth.js or a separate otp.js

module.exports = router;