// services/auditLog.js
const db = require('../db');

// Modify logAction to accept actorFullName
async function logAction(userId, actorFullName, action, details = {}) {
  try {
    const query = 'INSERT INTO Audit_Logs (user_id, actor_full_name, action, details) VALUES ($1, $2, $3, $4)';
    await db.query(query, [userId, actorFullName, action, JSON.stringify(details)]);
  } catch (err) {
    console.error('Failed to write to audit log:', err);
  }
}

module.exports = { logAction };