// routes/bookings.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, adminOnly, authorize } = require('../middleware/auth');
const { logAction } = require('../services/auditLog');

// --- BOOK AN ITEM FOR AN EVENT ---
router.post('/', protect, adminOnly, async (req, res) => { // Keep adminOnly for booking creation
  const { item_id, event_id } = req.body;
  const booked_by_user_id = req.user.id; // User making the booking
  try {
    // Check for event existence and dates
    const eventResult = await db.query('SELECT start_date, end_date FROM Events WHERE event_id = $1', [event_id]);
    if (eventResult.rows.length === 0) return res.status(404).json({ msg: 'Event not found' });
    const { start_date, end_date } = eventResult.rows[0];

    // Check for item availability within the event dates
    const conflictQuery = `
      SELECT b.event_id FROM Bookings b
      JOIN Events e ON b.event_id = e.event_id
      WHERE b.item_id = $1 AND (e.start_date, e.end_date) OVERLAPS ($2, $3);
    `;
    const conflictResult = await db.query(conflictQuery, [item_id, start_date, end_date]);
    if (conflictResult.rows.length > 0) {
      return res.status(409).json({ msg: 'Conflict: Item is already booked for an overlapping event.' });
    }

    const newBookingQuery = `INSERT INTO Bookings (item_id, event_id, booked_by_user_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *;`;
    const { rows } = await db.query(newBookingQuery, [item_id, event_id, booked_by_user_id]);
    
    // UPDATED CALL: Pass req.user.full_name (the person who created the booking)
    await logAction(req.user.id, req.user.full_name, 'booking_created', { bookingId: rows[0].booking_id, itemId: item_id, eventId: event_id });
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- GET ALL BOOKINGS (Admin/Management/Event Team) ---
router.get('/', protect, authorize('admin', 'management', 'event_team'), async (req, res) => {
  try {
    const query = `
      SELECT b.*, i.name as item_name, e.name as event_name, u.full_name as booked_by_user_name
      FROM Bookings b
      JOIN Inventory_Items i ON b.item_id = i.item_id
      JOIN Events e ON b.event_id = e.event_id
      LEFT JOIN Users u ON b.booked_by_user_id = u.user_id -- Left join as user might be removed (if FK was dropped/set null)
      ORDER BY b.created_at DESC;
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;