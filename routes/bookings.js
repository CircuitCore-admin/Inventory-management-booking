// routes/bookings.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, adminOnly } = require('../middleware/auth');
const { logAction } = require('../services/auditLog');

// --- BOOK AN ITEM FOR AN EVENT ---
router.post('/', protect, adminOnly, async (req, res) => {
  const { item_id, event_id } = req.body;
  const booked_by_user_id = req.user.id;
  try {
    const eventResult = await db.query('SELECT start_date, end_date FROM Events WHERE event_id = $1', [event_id]);
    if (eventResult.rows.length === 0) return res.status(404).json({ msg: 'Event not found' });
    const { start_date, end_date } = eventResult.rows[0];
    const conflictQuery = `SELECT b.event_id FROM Bookings b JOIN Events e ON b.event_id = e.event_id WHERE b.item_id = $1 AND (e.start_date, e.end_date) OVERLAPS ($2, $3);`;
    const conflictResult = await db.query(conflictQuery, [item_id, start_date, end_date]);
    if (conflictResult.rows.length > 0) return res.status(409).json({ msg: 'Conflict: Item is already booked for an overlapping event.' });

    const newBookingQuery = `INSERT INTO Bookings (item_id, event_id, booked_by_user_id) VALUES ($1, $2, $3) RETURNING *;`;
    const { rows } = await db.query(newBookingQuery, [item_id, event_id, booked_by_user_id]);
    
    await logAction(booked_by_user_id, 'booking_created', { item_id, event_id });
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- NEW: GET ALL BOOKINGS (with filtering by itemId or eventId) ---
router.get('/', protect, async (req, res) => {
  try {
    let query = `
        SELECT 
            b.booking_id, 
            b.event_id, 
            e.name as event_name, 
            i.item_id, 
            i.name as item_name
        FROM Bookings b
        JOIN Inventory_Items i ON b.item_id = i.item_id
        JOIN Events e ON b.event_id = e.event_id
    `;
    const params = [];
    const conditions = [];

    if (req.query.itemId) {
      params.push(req.query.itemId);
      conditions.push(`b.item_id = $${params.length}`);
    }

    if (req.query.eventId) {
      params.push(req.query.eventId);
      conditions.push(`b.event_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY b.created_at DESC';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- DELETE A BOOKING ---
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query('DELETE FROM Bookings WHERE booking_id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Booking not found' });
    }
    
    await logAction(req.user.id, 'booking_deleted', { booking_id: req.params.id, item_id: rows[0].item_id, event_id: rows[0].event_id });
    
    res.json({ msg: 'Booking deleted successfully.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;