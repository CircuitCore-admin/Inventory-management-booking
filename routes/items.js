// williams-inventory/routes/items.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Assuming bcryptjs is used elsewhere
const db = require('../db');
const { protect, adminOnly, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload'); // Now 'upload' is the Multer instance
const { logAction } = require('../services/auditLog');
const QRCode = require('qrcode'); // Import qrcode library
const path = require('path'); // For file paths
const fs = require('fs'); // For file system operations

// NEW: Check if unique identifier already exists - MUST BE BEFORE /:id routes
router.get('/check-identifier', protect, async (req, res) => { // ADDED protect middleware here
  const { identifier } = req.query;
  if (!identifier) {
    return res.status(400).json({ msg: 'Identifier query parameter is required.' });
  }
  try {
    const { rows } = await db.query('SELECT 1 FROM Inventory_Items WHERE unique_identifier = $1', [identifier]);
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    console.error('Error checking identifier:', err);
    res.status(500).send('Server Error');
  }
});

// NEW: Get count of items by region and category for identifier generation
router.get('/by-region-category-count', protect, async (req, res) => {
  const { region, category } = req.query;

  if (!region || !category) {
    return res.status(400).json({ msg: 'Region and category query parameters are required.' });
  }

  try {
    const result = await db.query(
      'SELECT COUNT(*) FROM Inventory_Items WHERE region = $1 AND category = $2',
      [region, category]
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error('Error fetching region-category count:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

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

    await logAction(req.user.id, req.user.full_name, 'item_scanned', { itemId: item.item_id, action, newStatus });

    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- CREATE NEW ITEM ---
router.post('/', protect, adminOnly, async (req, res) => {
  const { name, category, unique_identifier, purchase_cost, purchase_date, region } = req.body; // ADDED region
  try {
    const newIitemQuery = `
      INSERT INTO Inventory_Items (name, category, unique_identifier, purchase_cost, purchase_date, region)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
    `;
    const { rows } = await db.query(newIitemQuery, [name, category, unique_identifier, purchase_cost, purchase_date, region]); // ADDED region

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

// --- GET SINGLE ITEM BY ID --- (Now comes after /check-identifier)
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
    const { name, category, status, location, purchase_cost, purchase_date, region } = req.body; // ADDED region
    const updateQuery = `
      UPDATE Inventory_Items SET 
        name = $1, 
        category = $2, 
        status = $3, 
        location = $4, 
        purchase_cost = $5,
        purchase_date = $6,
        region = $7 -- ADDED region here
      WHERE item_id = $8 RETURNING *;
    `;
    const { rows } = await db.query(updateQuery, [name, category, status, location, purchase_cost, purchase_date, region, req.params.id]); // ADDED region
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Item not found' });
    }
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
    const { rows } = await db.query('DELETE FROM Inventory_Items WHERE item_id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Item not found' });
    }
    await logAction(req.user.id, req.user.full_name, 'item_deleted', { itemId: req.params.id, itemName: rows[0].name });
    res.json({ msg: `Item '${rows[0].name}' deleted successfully.` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- Generate QR Code for an Item --- (Also moved below /:id as it takes an itemId)
router.get('/:itemId/qrcode', protect, async (req, res) => {
  try {
    const { itemId } = req.params;
    const itemResult = await db.query('SELECT unique_identifier, name FROM Inventory_Items WHERE item_id = $1', [itemId]);

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Item not found.' });
    }

    const { unique_identifier, name } = itemResult.rows[0];
    const qrData = `Item: ${name}, ID: ${itemId}, Unique Identifier: ${unique_identifier}`; // Data to encode in QR code

    // Generate QR code as a data URL (PNG)
    const qrCodeDataUrl = await QRCode.toDataURL(qrData);

    res.json({ qrCodeDataUrl });
  } catch (err) {
    console.error('Error generating QR code:', err);
    res.status(500).send('Server Error');
  }
});

// --- Upload Media for an Item ---
router.post('/:itemId/media', protect, upload.single('file'), async (req, res) => {
  try {
    const { itemId } = req.params;
    const { description, media_type } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ msg: 'No file uploaded.' });
    }

    const mediaUrl = `/uploads/${file.filename}`;

    const query = `
      INSERT INTO Item_Media (item_id, media_url, media_type, description, uploaded_by)
      VALUES ($1, $2, $3, $4, $5) RETURNING *;
    `;
    const { rows } = await db.query(query, [itemId, mediaUrl, media_type, description, req.user.id]);

    await logAction(req.user.id, req.user.full_name, 'item_media_uploaded', { itemId, mediaId: rows[0].media_id, mediaType: media_type, filename: file.filename });

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error uploading media:', err);
    res.status(500).send(`Server Error: ${err.message || err}`);
    if (file && file.path) {
      fs.unlink(file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Failed to clean up uploaded file:', unlinkErr);
      });
    }
  }
});

// --- Get All Media for an Item ---
router.get('/:itemId/media', protect, async (req, res) => {
  try {
    const { itemId } = req.params;
    const query = 'SELECT media_id, item_id, media_url, media_type, description, uploaded_at FROM Item_Media WHERE item_id = $1 ORDER BY uploaded_at DESC;';
    const { rows } = await db.query(query, [itemId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching item media:', err);
    res.status(500).send('Server Error');
  }
});

// --- Delete Item Media ---
router.delete('/media/:mediaId', protect, adminOnly, async (req, res) => {
  try {
    const { mediaId } = req.params;

    const mediaResult = await db.query('SELECT media_url FROM Item_Media WHERE media_id = $1', [mediaId]);
    if (mediaResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Media not found.' });
    }
    const mediaUrl = mediaResult.rows[0].media_url;
    const filePath = path.join(__dirname, '..', 'public', mediaUrl);

    const { rows } = await db.query('DELETE FROM Item_Media WHERE media_id = $1 RETURNING *;', [mediaId]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Media not found or already deleted.' });
    }

    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Failed to delete file from disk: ${filePath}`, err);
      } else {
        console.log(`Deleted file from disk: ${filePath}`);
      }
    });

    await logAction(req.user.id, req.user.full_name, 'item_media_deleted', { mediaId, mediaUrl });

    res.json({ msg: 'Media deleted successfully.' });
  } catch (err) {
    console.error('Error deleting media:', err);
    res.status(500).send('Server Error');
  }
});


module.exports = router;