// services/auditLog.js
const db = require('../db');

async function logAction(userId, action, details = {}) {
  try {
    const query = 'INSERT INTO Audit_Logs (user_id, action, details) VALUES ($1, $2, $3)';
    await db.query(query, [userId, action, JSON.stringify(details)]);
  } catch (err) {
    console.error('Failed to write to audit log:', err);
  }
}

module.exports = { logAction };