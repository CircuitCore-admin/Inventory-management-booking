// routes/activation-types.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect, adminOnly } = require('../middleware/auth');

// GET all custom activation types
router.get('/', protect, async (req, res) => {
    try {
        const { rows } = await db.query("SELECT * FROM event_activation_types ORDER BY id");
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new custom activation type
router.post('/', protect, adminOnly, async (req, res) => {
    const { label, color } = req.body;
    try {
        const { rows } = await db.query(
            "INSERT INTO event_activation_types (label, color) VALUES ($1, $2) RETURNING *",
            [label, color]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE a custom activation type
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        await db.query("DELETE FROM events_event_activation_types WHERE id = $1", [req.params.id]);
        res.status(200).json({ msg: 'Activation type deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;