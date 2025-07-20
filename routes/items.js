// routes/items.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, adminOnly, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload'); // Assuming this middleware handles file uploads
const { logAction } = require('../services/auditLog');

// --- GET ALL ITEMS ---
router.get('/', protect, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM Inventory_Items ORDER BY item_id ASC');
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- SCAN ITEM (Check-in/Check-out) ---
router.post('/scan', protect, authorize('admin', 'management', 'warehouse'), async (req, res) => {
  const { unique_identifier, action } = req.body; // action can be 'check_in', 'check_out', etc.
  try {
    const itemResult = await db.query('SELECT * FROM Inventory_Items WHERE unique_identifier = $1', [unique_identifier]);
    if (itemResult.rows.length === 0) return res.status(404).json({ msg: 'Item with this identifier not found.' });
    
    const item = itemResult.rows[0];
    let newStatus = item.status, newLocation = item.location;

    if (action === 'check_out') {
      const bookingQuery = `SELECT e.name FROM Events e JOIN Bookings b ON e.event_id = b.event_id WHERE b.item_id = $1 AND e.start_date >= CURRENT_DATE ORDER BY e.start_date ASC LIMIT 1;`;
      const eventResult = await db.query(bookingQuery, [item.item_id]);
      newStatus = 'In Transit';
      newLocation = eventResult.rows.length > 0 ? `Event: ${eventResult.rows[0].name}` : 'Unknown Event';
    } else if (action === 'check_in') {
      newStatus = 'In Storage';
      newLocation = 'Main Warehouse';
    } else {
      return res.status(400).json({ msg: 'Invalid action specified.' });
    }

    const updateQuery = 'UPDATE Inventory_Items SET status = $1, location = $2 WHERE item_id = $3 RETURNING *;';
    const { rows } = await db.query(updateQuery, [newStatus, newLocation, item.item_id]);
    
    // UPDATED CALL: Pass req.user.full_name
    await logAction(req.user.id, req.user.full_name, 'item_scanned', { itemId: item.item_id, action, newStatus });
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- CREATE NEW ITEM ---
router.post('/', protect, adminOnly, async (req, res) => {
  const { name, category, unique_identifier, purchase_cost, purchase_date } = req.body;
  try {
    const newIitemQuery = `
      INSERT INTO Inventory_Items (name, category, unique_identifier, purchase_cost, purchase_date)
      VALUES ($1, $2, $3, $4, $5) RETURNING *;
    `;
    const { rows } = await db.query(newIitemQuery, [name, category, unique_identifier, purchase_cost, purchase_date]);
    
    // UPDATED CALL: Pass req.user.full_name
    await logAction(req.user.id, req.user.full_name, 'item_created', { itemId: rows[0].item_id, itemName: rows[0].name });
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    if (err.code === '23505') { // unique_identifier already exists
        return res.status(400).json({ msg: 'Item with this unique identifier already exists.' });
    }
    res.status(500).send('Server Error');
  }
});

// --- GET SINGLE ITEM BY ID ---
router.get('/:id', protect, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM Inventory_Items WHERE item_id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Item not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- UPDATE ITEM ---
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, category, status, location, purchase_cost } = req.body;
    const updateQuery = `
      UPDATE Inventory_Items SET name = $1, category = $2, status = $3, location = $4, purchase_cost = $5
      WHERE item_id = $6 RETURNING *;
    `;
    const { rows } = await db.query(updateQuery, [name, category, status, location, purchase_cost, req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Item not found' });
    }
    // UPDATED CALL: Pass req.user.full_name
    await logAction(req.user.id, req.user.full_name, 'item_updated', { itemId: req.params.id, itemName: rows[0].name });
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- DELETE ITEM ---
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    // If Item_Media or Bookings have ON DELETE RESTRICT for item_id,
    // this will fail if any media or bookings are linked.
    // If you always want to delete related media/bookings, ensure ON DELETE CASCADE.
    const { rows } = await db.query('DELETE FROM Inventory_Items WHERE item_id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Item not found' });
    }
    // UPDATED CALL: Pass req.user.full_name
    await logAction(req.user.id, req.user.full_name, 'item_deleted', { itemId: req.params.id, itemName: rows[0].name });
    res.json({ msg: `Item '${rows[0].name}' deleted successfully.` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;