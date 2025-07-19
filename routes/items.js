// routes/items.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, adminOnly, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
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

// --- SCAN ITEM ---
router.post('/scan', protect, authorize('admin', 'management', 'warehouse'), async (req, res) => {
  const { unique_identifier, action } = req.body;
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
    
    await logAction(req.user.id, 'item_scanned', { itemId: item.item_id, action, newStatus });
    
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
    const newItemQuery = `INSERT INTO Inventory_Items (name, category, unique_identifier, purchase_cost, purchase_date) VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
    const { rows } = await db.query(newItemQuery, [name, category, unique_identifier, purchase_cost, purchase_date]);
    
    await logAction(req.user.id, 'item_created', { itemId: rows[0].item_id, itemName: rows[0].name });
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
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
    const updateQuery = `UPDATE Inventory_Items SET name = $1, category = $2, status = $3, location = $4, purchase_cost = $5 WHERE item_id = $6 RETURNING *;`;
    const { rows } = await db.query(updateQuery, [name, category, status, location, purchase_cost, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ msg: 'Item not found' });
    
    await logAction(req.user.id, 'item_updated', { itemId: req.params.id });
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- DELETE ITEM ---
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query('DELETE FROM Inventory_Items WHERE item_id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ msg: 'Item not found' });
    
    await logAction(req.user.id, 'item_deleted', { itemId: req.params.id, itemName: rows[0].name });
    
    res.json({ msg: `Item '${rows[0].name}' was deleted.` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- UPLOAD MEDIA FOR AN ITEM ---
router.post('/:id/media', protect, upload, async (req, res) => {
  if (!req.file) return res.status(400).json({ msg: 'No file uploaded.' });
  
  const item_id = req.params.id;
  const media_url = req.file.path;
  const media_type = req.file.mimetype.startsWith('image') ? 'image' : 'other';
  const description = req.body.description || '';
  const uploaded_by = req.user.id;
  try {
    const newMediaQuery = `INSERT INTO Item_Media (item_id, media_url, media_type, description, uploaded_by) VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
    const { rows } = await db.query(newMediaQuery, [item_id, media_url, media_type, description, uploaded_by]);
    
    await logAction(uploaded_by, 'media_uploaded', { itemId: item_id, mediaUrl: media_url });
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;