// routes/maintenance.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, authorize } = require('../middleware/auth');
const { logAction } = require('../services/auditLog');

// --- CREATE A NEW MAINTENANCE TICKET ---
router.post('/', protect, authorize('admin', 'management', 'warehouse', 'event_team'), async (req, res) => {
  const { item_id, description } = req.body;
  const reported_by_user_id = req.user.id;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const newLogQuery = `INSERT INTO Maintenance_Logs (item_id, reported_by_user_id, description) VALUES ($1, $2, $3) RETURNING *;`;
    const logResult = await client.query(newLogQuery, [item_id, reported_by_user_id, description]);
    const updateItemQuery = `UPDATE Inventory_Items SET status = 'In Repair' WHERE item_id = $1;`;
    await client.query(updateItemQuery, [item_id]);
    await client.query('COMMIT');

    await logAction(reported_by_user_id, 'maintenance_ticket_created', { ticketId: logResult.rows[0].log_id, itemId: item_id });
    
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
    const { rows } = await db.query(`SELECT l.*, i.name as item_name, u.full_name as reported_by FROM Maintenance_Logs l JOIN Inventory_Items i ON l.item_id = i.item_id JOIN Users u ON l.reported_by_user_id = u.user_id ORDER BY l.created_at DESC;`);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- UPDATE A MAINTENANCE TICKET ---
router.put('/:id', protect, authorize('admin', 'management'), async (req, res) => {
  const { status } = req.body;
  const log_id = req.params.id;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const logUpdateQuery = 'UPDATE Maintenance_Logs SET status = $1, resolved_at = CASE WHEN $1 = \'resolved\' THEN NOW() ELSE NULL END WHERE log_id = $2 RETURNING *;';
    const logResult = await client.query(logUpdateQuery, [status, log_id]);
    if (logResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ msg: 'Maintenance log not found' });
    }
    if (status === 'resolved') {
      const item_id = logResult.rows[0].item_id;
      await client.query('UPDATE Inventory_Items SET status = \'In Storage\' WHERE item_id = $1;', [item_id]);
    }
    await client.query('COMMIT');

    await logAction(req.user.id, 'maintenance_ticket_updated', { ticketId: log_id, newStatus: status });
    
    res.json(logResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});

module.exports = router;