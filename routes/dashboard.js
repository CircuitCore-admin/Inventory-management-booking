// routes/dashboard.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, authorize } = require('../middleware/auth');
const { logAction } = require('../services/auditLog'); // Ensure logAction is imported if used here

router.get('/summary', protect, authorize('admin', 'management'), async (req, res) => {
  try {
    // We run all queries concurrently for better performance
    const [itemsInRepair, availableItems, upcomingEvents, openTickets] = await Promise.all([
      db.query("SELECT COUNT(*) FROM Inventory_Items WHERE status = 'In Repair'"),
      db.query("SELECT COUNT(*) FROM Inventory_Items WHERE status = 'In Storage'"),
      db.query("SELECT COUNT(*) FROM Events WHERE start_date >= CURRENT_DATE"),
      db.query("SELECT COUNT(*) FROM Maintenance_Logs WHERE status = 'open'")
    ]);

    const summary = {
      items_in_repair: parseInt(itemsInRepair.rows[0].count, 10),
      available_items: parseInt(availableItems.rows[0].count, 10),
      upcoming_events: parseInt(upcomingEvents.rows[0].count, 10),
      open_tickets: parseInt(openTickets.rows[0].count, 10),
    };

    // If you want to log dashboard views:
    // await logAction(req.user.id, req.user.full_name, 'dashboard_viewed', {});

    res.json(summary);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;