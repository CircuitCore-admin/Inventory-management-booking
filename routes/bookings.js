// routes/bookings.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, adminOnly } = require('../middleware/auth');
const { logAction } = require('../services/auditLog');

// @route   POST /api/bookings/:eventId/allocate
// @desc    Allocate multiple inventory items to a specific event
// @access  Private (Admin Only)
router.post('/:eventId/allocate', protect, adminOnly, async (req, res) => {
    const { eventId } = req.params;
    const { items } = req.body; // items is an array of { itemId: number, pickupLocation: string }

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ msg: 'No items provided for allocation.' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Check if event exists and is approved
        const eventResult = await client.query('SELECT event_id, name, booking_status FROM Events WHERE event_id = $1', [eventId]);
        if (eventResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Event not found.' });
        }
        
        // Prepare to check item availability and update status
        const itemIds = items.map(item => item.itemId);
        const itemCheckQuery = 'SELECT item_id, name, status FROM inventory_items WHERE item_id = ANY($1::int[]) AND status = $2';
        const itemCheckResult = await client.query(itemCheckQuery, [itemIds, 'In Storage']);

        if (itemCheckResult.rows.length !== itemIds.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: 'One or more items are not available for allocation (not in "In Storage" status).' });
        }
        
        // Update the status of each item to 'In Use'
        const updateStatusQuery = 'UPDATE inventory_items SET status = $1 WHERE item_id = ANY($2::int[])';
        await client.query(updateStatusQuery, ['In Use', itemIds]);

        // Insert new allocated items
        const allocationQuery = `
            INSERT INTO allocated_items (event_id, item_id, pickup_location)
            VALUES ($1, $2, $3);
        `;
        for (const item of items) {
            await client.query(allocationQuery, [eventId, item.itemId, item.pickupLocation || null]);
        }

        // Update the event booking status
        const updateEventStatusQuery = 'UPDATE events SET booking_status = $1 WHERE event_id = $2';
        await client.query(updateEventStatusQuery, ['Allocated', eventId]);

        // Log the action
        await logAction(req.user.id, req.user.full_name, 'items_allocated', { eventId, itemIds, eventName: eventResult.rows[0].name });

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Items allocated successfully.', eventId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error allocating items:', err);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

// @route   GET /api/bookings/:eventId
// @desc    Get all allocated items for a specific event
// @access  Private (Admin Only)
router.get('/:eventId', protect, adminOnly, async (req, res) => {
    const { eventId } = req.params;
    try {
        const query = `
            SELECT 
                ai.allocation_id, 
                ai.event_id, 
                ai.item_id,
                ai.pickup_location,
                ai.status AS allocation_status,
                ai.allocated_at,
                ai.picked_up_at,
                ai.returned_at,
                ii.name,
                ii.unique_identifier,
                ii.category
            FROM allocated_items ai
            JOIN inventory_items ii ON ai.item_id = ii.item_id
            WHERE ai.event_id = $1
            ORDER BY ii.name;
        `;
        const { rows } = await db.query(query, [eventId]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching allocated items:', err);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/bookings/:eventId/items/:itemId/status
// @desc    Update the status of a single allocated item
// @access  Private (Admin Only)
router.put('/:eventId/items/:itemId/status', protect, adminOnly, async (req, res) => {
    const { eventId, itemId } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ msg: 'Item status is required.' });
    }

    const validStatuses = ['Allocated', 'Picked Up', 'Returned'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ msg: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // Update the status in allocated_items
        const updateAllocationQuery = `
            UPDATE allocated_items
            SET status = $1, 
                picked_up_at = CASE WHEN $1 = 'Picked Up' THEN NOW() ELSE picked_up_at END,
                returned_at = CASE WHEN $1 = 'Returned' THEN NOW() ELSE returned_at END
            WHERE event_id = $2 AND item_id = $3
            RETURNING *;
        `;
        const allocationResult = await client.query(updateAllocationQuery, [status, eventId, itemId]);

        if (allocationResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Allocated item not found.' });
        }

        // If the item is returned, update its inventory status
        if (status === 'Returned') {
            const updateItemQuery = `
                UPDATE inventory_items
                SET status = 'In Storage'
                WHERE item_id = $1;
            `;
            await client.query(updateItemQuery, [itemId]);
        }

        await client.query('COMMIT');
        await logAction(req.user.id, req.user.full_name, 'allocation_status_updated', { eventId, itemId, newStatus: status });

        res.json({ msg: `Item status updated to ${status}.` });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating allocation status:', err);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

// @route   GET /api/bookings
// @desc    Get all events with booking status
// @access  Private (Admin Only)
router.get('/', protect, adminOnly, async (req, res) => {
    try {
        const query = 'SELECT event_id, name, location, start_date, end_date, booking_status FROM events ORDER BY start_date DESC';
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching events with booking status:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;