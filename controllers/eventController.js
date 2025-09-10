// controllers/eventController.js
const pool = require('../db');
const { logAction } = require('../services/auditLog');
const fs = require('fs');
const path = require('path');

// --- MODIFIED: Fetch Updates and Reactions for a specific event ---
const getUpdatesForEvent = async (eventId) => {
    const updatesQuery = `
        SELECT
            eu.*,
            u.full_name AS uploaded_by_full_name,
            COUNT(ur.reaction_id) AS reaction_count
        FROM
            event_updates eu
        LEFT JOIN
            users u ON eu.uploaded_by_user_id = u.user_id
        LEFT JOIN
            update_reactions ur ON eu.update_id = ur.update_id
        WHERE
            eu.event_id = $1
        GROUP BY
            eu.update_id, u.full_name
        ORDER BY
            eu.uploaded_at DESC
    `;
    const updatesResult = await pool.query(updatesQuery, [eventId]);
    return updatesResult.rows;
};

// --- MODIFIED UNIFIED FUNCTION: Add a new update (note or document) or a reply ---
const addEventUpdate = async (req, res) => {
    const { eventId } = req.params;
    const { note_text, parent_id } = req.body;
    const userId = req.user.id;
    const file = req.file;

    if (!note_text && !file) {
        return res.status(400).json({ msg: 'Note text or a file is required.' });
    }

    try {
        let filePath = null;
        let fileName = null;
        let fileType = null;

        if (file) {
            filePath = `/uploads/events/${file.filename}`;
            fileName = file.originalname;
            fileType = file.mimetype;
        }

        const newUpdate = await pool.query(
            `INSERT INTO event_updates (event_id, update_text, file_name, file_path, file_type, uploaded_by_user_id, parent_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [eventId, note_text, fileName, filePath, fileType, userId, parent_id]
        );

        res.status(201).json(newUpdate.rows[0]);
    } catch (error) {
        console.error('Error adding event update:', error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// --- NEW FUNCTION: Add or remove a reaction to an update ---
const toggleReaction = async (req, res) => {
    const { updateId } = req.params;
    const { reaction_type } = req.body;
    const userId = req.user.id;

    try {
        const checkQuery = await pool.query(
            'SELECT reaction_id FROM update_reactions WHERE update_id = $1 AND user_id = $2 AND reaction_type = $3',
            [updateId, userId, reaction_type]
        );

        if (checkQuery.rows.length > 0) {
            // Reaction already exists, so remove it
            await pool.query(
                'DELETE FROM update_reactions WHERE update_id = $1 AND user_id = $2 AND reaction_type = $3',
                [updateId, userId, reaction_type]
            );
            res.status(200).json({ msg: 'Reaction removed' });
        } else {
            // Reaction does not exist, so add it
            await pool.query(
                'INSERT INTO update_reactions (update_id, user_id, reaction_type) VALUES ($1, $2, $3)',
                [updateId, userId, reaction_type]
            );
            res.status(201).json({ msg: 'Reaction added' });
        }
    } catch (error) {
        console.error('Error toggling reaction:', error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// --- MODIFIED: Delete an event update (note or document) ---
const deleteEventUpdate = async (req, res) => {
    const { updateId } = req.params;

    try {
        const result = await pool.query('DELETE FROM event_updates WHERE update_id = $1 RETURNING file_path', [updateId]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ msg: 'Event update not found' });
        }

        const filePath = result.rows[0].file_path;
        if (filePath) {
            // Delete the file from the filesystem
            const absolutePath = path.join(__dirname, '..', 'public', filePath);
            fs.unlink(absolutePath, (err) => {
                if (err) {
                    console.error('Error deleting file from filesystem:', err.message);
                }
            });
        }
        
        res.status(200).json({ msg: 'Event update deleted successfully' });
    } catch (error) {
        console.error('Error deleting event update:', error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

module.exports = {
    getUpdatesForEvent,
    addEventUpdate,
    deleteEventUpdate,
    toggleReaction,
};