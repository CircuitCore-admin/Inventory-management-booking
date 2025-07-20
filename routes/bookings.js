// routes/bookings.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, authorize } = require('../middleware/auth');
const { logAction } = require('../services/auditLog');

// --- GET ALL BOOKINGS (with filtering by eventId) ---
// THIS IS THE MISSING ROUTE
router.get('/', protect, async (req, res) => {
  try {
    let query = `
        SELECT i.item_id, i.name, i.category, i.unique_identifier
        FROM bookings b
        JOIN inventory_items i ON b.item_id = i.item_id
    `;
    const params = [];

    if (req.query.eventId) {
      params.push(req.query.eventId);
      query += ` WHERE b.event_id = $1`;
    }

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- BOOK AN ITEM FOR AN EVENT ---
// A single, corrected route for creating bookings
router.post('/', protect, authorize('admin', 'management', 'event_team'), async (req, res) => {
  const { item_id, event_id, condition_before } = req.body;
  const assigned_by = req.user.id;
  try {
    const eventResult = await db.query('SELECT start_date, end_date FROM events WHERE event_id = $1', [event_id]);
    if (eventResult.rows.length === 0) return res.status(404).json({ msg: 'Event not found' });

    const { start_date, end_date } = eventResult.rows[0];
    const conflictQuery = `SELECT b.event_id FROM bookings b JOIN events e ON b.event_id = e.event_id WHERE b.item_id = $1 AND (e.start_date, e.end_date) OVERLAPS ($2, $3);`;
    const conflictResult = await db.query(conflictQuery, [item_id, start_date, end_date]);

    if (conflictResult.rows.length > 0) {
        return res.status(409).json({ msg: 'Conflict: Item is already booked for an overlapping event.' });
    }

    // Updated to match your v4.sql schema
    const newBookingQuery = `INSERT INTO bookings (item_id, event_id, booked_by_user_id, assigned_by, condition_before) VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
    const { rows } = await db.query(newBookingQuery, [item_id, event_id, assigned_by, assigned_by, condition_before]);

    await logAction(req.user.id, 'item_booked', { bookingId: rows[0].booking_id, itemId: item_id, eventId: event_id });

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- DELETE A BOOKING ---
router.delete('/:bookingId', protect, authorize('admin', 'management'), async (req, res) => {
    try {
        const { rows } = await db.query('DELETE FROM bookings WHERE booking_id = $1 RETURNING *', [req.params.bookingId]);
        if (rows.length === 0) {
            return res.status(404).json({ msg: 'Booking not found.' });
        }
        await logAction(req.user.id, 'booking_deleted', { bookingId: req.params.bookingId });
        res.json({ msg: 'Booking removed successfully.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;