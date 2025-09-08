// routes/events.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, adminOnly, authorize } = require('../middleware/auth');
const { logAction } = require('../services/auditLog');

// --- GET ALL EVENTS ---
router.get('/', protect, async (req, res) => {
  try {
    // Corrected: Removed the WHERE clause to fetch all events regardless of status
    const { rows } = await db.query("SELECT * FROM events ORDER BY start_date DESC");
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- GET A SINGLE EVENT BY ITS ID ---
router.get('/:eventId', protect, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM events WHERE event_id = $1', [req.params.eventId]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// CORRECTED ROUTE: GET all allocated items for a specific event
// This now returns both the integer item_id and the unique_identifier string.
router.get('/:eventId/allocated-items', protect, async (req, res) => {
  try {
    const query = `
            SELECT ii.item_id, ii.unique_identifier, ii.name, ii.category, ai.pickup_location
            FROM allocated_items ai
            JOIN inventory_items ii ON ai.item_id = ii.item_id
            WHERE ai.event_id = $1
            ORDER BY ii.name;
        `;
    const { rows } = await db.query(query, [req.params.eventId]);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch allocated items:', err.message);
    res.status(500).send('Server Error');
  }
});

// NEW ROUTE: PUT /api/events/:eventId/allocated-items/:itemId
// This route updates an allocated item's details, such as pickup_location.
router.put('/:eventId/allocated-items/:itemId', protect, async (req, res) => {
    const { eventId, itemId } = req.params;
    const { pickup_location } = req.body;
    try {
        const updateQuery = `
            UPDATE allocated_items
            SET pickup_location = $1
            WHERE event_id = $2 AND item_id = $3
            RETURNING *;
        `;
        const { rows } = await db.query(updateQuery, [pickup_location, eventId, itemId]);
        if (rows.length === 0) {
            return res.status(404).json({ msg: 'Allocated item not found.' });
        }
        await logAction(req.user.id, 'allocated_item_updated', { eventId, itemId, newLocation: pickup_location });
        res.json(rows[0]);
    } catch (err) {
        console.error('Database Error during allocated item update:', err.message);
        res.status(500).json({ msg: 'Failed to update allocated item due to a server error.' });
    }
});

// CORRECTED ROUTE: UPDATE AN EXISTING EVENT
router.put('/:id', protect, authorize('admin', 'management'), async (req, res) => {
  const eventId = req.params.id;
  const { status, activation_type, partner, continent, staffing, staff_members, name, location, start_date, end_date } = req.body;

  const updateFields = [];
  const queryValues = [];
  let paramCounter = 1;

  if (name !== undefined) {
    updateFields.push(`name = $${paramCounter++}`);
    queryValues.push(name);
  }
  if (location !== undefined) {
    updateFields.push(`location = $${paramCounter++}`);
    queryValues.push(location);
  }
  if (status !== undefined) {
    updateFields.push(`status = $${paramCounter++}`);
    queryValues.push(status);
  }
  if (activation_type !== undefined) {
    updateFields.push(`activation_type = $${paramCounter++}`);
    queryValues.push(activation_type);
  }
  if (partner !== undefined) {
    updateFields.push(`partner = $${paramCounter++}`);
    queryValues.push(partner);
  }
  if (continent !== undefined) {
    updateFields.push(`continent = $${paramCounter++}`);
    queryValues.push(continent);
  }
  if (staffing !== undefined) {
    updateFields.push(`staffing = $${paramCounter++}`);
    queryValues.push(staffing);
  }
  if (staff_members !== undefined) {
    updateFields.push(`staff_members = $${paramCounter++}`);
    queryValues.push(staff_members);
  }
  if (start_date !== undefined) {
    updateFields.push(`start_date = $${paramCounter++}`);
    queryValues.push(start_date);
  }
  if (end_date !== undefined) {
    updateFields.push(`end_date = $${paramCounter++}`);
    queryValues.push(end_date);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ msg: 'No fields to update.' });
  }

  const updateQuery = `
    UPDATE events
    SET ${updateFields.join(', ')}
    WHERE event_id = $${paramCounter}
    RETURNING *;
  `;
  queryValues.push(eventId);

  try {
    const { rows } = await db.query(updateQuery, queryValues);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Event not found' });
    }

    const logMessage = `Updated event (ID: ${eventId}).`;
    await logAction(req.user.id, 'event_updated', logMessage);

    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- GET A SINGLE EVENT BY ITS ID ---
router.get('/:eventId', protect, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM events WHERE event_id = $1', [req.params.eventId]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// CORRECTED ROUTE: DELETE /api/events/:eventId/allocated-items/:itemId
// This route deallocates a specific item from an event.
router.delete('/:eventId/allocated-items/:itemId', protect, async (req, res) => {
  const { eventId, itemId } = req.params;
  try {
    await db.query('BEGIN');

    const { rowCount } = await db.query('DELETE FROM allocated_items WHERE event_id = $1 AND item_id = $2', [eventId, itemId]);

    if (rowCount === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ msg: 'Item not found in this allocation.' });
    }

    const updateStatusQuery = `
            UPDATE inventory_items
            SET status = 'In Storage'
            WHERE item_id = $1;
        `;
    await db.query(updateStatusQuery, [itemId]);
    await db.query('COMMIT');

    await logAction(req.user.id, 'item_deallocated', { eventId, itemId });
    res.status(200).json({ msg: `Item ${itemId} deallocated successfully from event ${eventId}.` });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Database Error during item deallocation:', err.message);
    res.status(500).json({ msg: 'Failed to deallocate item due to a server error.' });
  }
});


// NEW ROUTE: POST /api/events/:eventId/allocate-items
router.post('/:eventId/allocate-items', protect, async (req, res) => {
    const { items: itemsToAllocate } = req.body;
    const { eventId } = req.params;

    if (!itemsToAllocate || !Array.isArray(itemsToAllocate) || itemsToAllocate.length === 0) {
        return res.status(400).json({ msg: 'No items provided for allocation.' });
    }

    try {
        const queryText = `
            INSERT INTO allocated_items (event_id, item_id, pickup_location, status)
            VALUES ($1, unnest($2::int[]), unnest($3::text[]), 'Allocated')
            RETURNING *;
        `;

        const itemIds = itemsToAllocate.map(item => item.itemId);
        const pickupLocations = itemsToAllocate.map(item => item.pickupLocation);

        await db.query('BEGIN');
        const { rows } = await db.query(queryText, [eventId, itemIds, pickupLocations]);

        const updateStatusQuery = `
            UPDATE inventory_items
            SET status = 'In Use'
            WHERE item_id = ANY($1::int[]);
        `;
        await db.query(updateStatusQuery, [itemIds]);
        await db.query('COMMIT');

        await logAction(req.user.id, 'items_allocated', { eventId, itemIds });
        res.status(201).json({ msg: `${rows.length} items allocated successfully.`, allocatedItems: rows });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Database Error during item allocation:', err.message);
        res.status(500).json({ msg: 'Failed to allocate items due to a server error.' });
    }
});

// CORRECTED ROUTE: POST /api/events
// This route now correctly handles the 'notes' field.
router.post('/', protect, async (req, res) => {
    const { name, location, start_date, end_date, notes } = req.body;
    try {
        const queryText = `
            INSERT INTO events (name, location, start_date, end_date, notes, requested_by_user_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const { rows } = await db.query(queryText, [name, location, start_date, end_date, notes, req.user.id]);
        await logAction(req.user.id, 'event_created', { eventId: rows[0].event_id, eventName: rows[0].name });
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- DELETE AN EVENT ---
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query('DELETE FROM events WHERE event_id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    await logAction(req.user.id, 'event_deleted', { eventId: req.params.id, eventName: rows[0].name });
    res.json({ msg: `Event '${rows[0].name}' was deleted.` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;