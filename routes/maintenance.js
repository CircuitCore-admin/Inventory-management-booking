// routes/maintenance.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, authorize } = require('../middleware/auth');
const { logAction } = require('../services/auditLog');

// --- CREATE A NEW MAINTENANCE TICKET ---
router.post('/', protect, authorize('admin', 'management', 'warehouse', 'event_team'), async (req, res) => {
  const { item_id, description } = req.body;
  const reported_by_user_id = req.user.id; // User reporting the ticket
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const newLogQuery = `INSERT INTO Maintenance_Logs (item_id, reported_by_user_id, description, status, created_at) VALUES ($1, $2, $3, 'open', NOW()) RETURNING *;`;
    const logResult = await client.query(newLogQuery, [item_id, reported_by_user_id, description]);
    
    const updateItemQuery = `UPDATE Inventory_Items SET status = 'In Repair' WHERE item_id = $1;`;
    await client.query(updateItemQuery, [item_id]);
    
    await client.query('COMMIT');

    // UPDATED CALL: Pass req.user.full_name (the person who created the ticket)
    await logAction(reported_by_user_id, req.user.full_name, 'maintenance_ticket_created', { ticketId: logResult.rows[0].log_id, itemId: item_id });
    
    res.status(201).json(logResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});

// --- GET ALL MAINTENANCE TICKETS ---
router.get('/', protect, authorize('admin', 'management'), async (req, res) => {
  try {
    // Note: If Users are disabled/deleted, `u.full_name` might be null if FK was SET NULL
    // or the join might filter out records if FK was RESTRICT.
    // With no FK on reported_by_user_id (as discussed), this will just be a dangling reference.
    const query = `
      SELECT l.*, i.name as item_name, u.full_name as reported_by_user_name
      FROM Maintenance_Logs l
      JOIN Inventory_Items i ON l.item_id = i.item_id
      LEFT JOIN Users u ON l.reported_by_user_id = u.user_id
      ORDER BY l.created_at DESC;
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;