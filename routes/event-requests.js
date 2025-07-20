// routes/event-requests.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, authorize } = require('../middleware/auth');
const { logAction } = require('../services/auditLog');

// --- CREATE A NEW EVENT REQUEST ---
// Accessible by event_team, management, and admin
router.post('/', protect, authorize('admin', 'management', 'event_team'), async (req, res) => {
  const { name, location, start_date, end_date, requested_gear, notes } = req.body;
  const requested_by = req.user.id;

  try {
    const newRequestQuery = `
      INSERT INTO event_requests (requested_by, name, location, start_date, end_date, requested_gear, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
    `;
    const { rows } = await db.query(newRequestQuery, [requested_by, name, location, start_date, end_date, requested_gear, notes]);
    
    await logAction(req.user.id, 'event_request_created', { requestId: rows[0].request_id, eventName: name });
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- GET ALL EVENT REQUESTS ---
// For admins and managers to view pending requests
router.get('/', protect, authorize('admin', 'management'), async (req, res) => {
  try {
    // Join with users table to get the name of who requested the event
    const query = `
        SELECT er.*, u.full_name as requested_by_name 
        FROM event_requests er
        JOIN users u ON er.requested_by = u.user_id
        ORDER BY er.created_at DESC;
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (err)    {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- APPROVE OR DENY AN EVENT REQUEST ---
// For admins and managers
router.put('/:id/status', protect, authorize('admin', 'management'), async (req, res) => {
    const { status } = req.body; // Expecting 'Approved' or 'Denied'
    const requestId = req.params.id;
    const client = await db.getClient(); // Use a transaction

    if (!['Approved', 'Denied'].includes(status)) {
        return res.status(400).json({ msg: 'Invalid status provided.' });
    }

    try {
        await client.query('BEGIN');

        // Step 1: Update the request's status
        const updateRequestQuery = 'UPDATE event_requests SET status = $1 WHERE request_id = $2 RETURNING *;';
        const requestResult = await client.query(updateRequestQuery, [status, requestId]);

        if (requestResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Event request not found.' });
        }
        
        const eventRequest = requestResult.rows[0];

        // Step 2: If approved, create a new entry in the main 'events' table
        if (status === 'Approved') {
            const newEventQuery = `
                INSERT INTO events (name, location, start_date, end_date)
                VALUES ($1, $2, $3, $4) RETURNING *;
            `;
            await client.query(newEventQuery, [
                eventRequest.name,
                eventRequest.location,
                eventRequest.start_date,
                eventRequest.end_date
            ]);
        }

        await client.query('COMMIT');
        
        await logAction(req.user.id, `event_request_${status.toLowerCase()}`, { requestId, eventName: eventRequest.name });

        res.json(eventRequest);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

module.exports = router;