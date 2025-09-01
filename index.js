// index.js
require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors'); // Import cors middleware

// Connect Database (Ensure your db.js handles the connection logic)
// const db = require('./db');
// db.query('SELECT 1').then(() => console.log('PostgreSQL connected')).catch(err => console.error('PostgreSQL connection error:', err));

// Init Middleware
app.use(express.json({ extended: false })); // Body parser for JSON
app.use(cors()); // Use CORS middleware for cross-origin requests

// --- Custom Middleware for PDF Content-Type ---
// This ensures PDF files are served with the correct Content-Type (application/pdf).
// Place it before your express.static middleware.
app.use((req, res, next) => {
    if (req.path.endsWith('.pdf')) {
        res.set('Content-Type', 'application/pdf');
    }
    next();
});

// --- Serve Static Files ---
// Serve files from the 'public/uploads' directory under the '/uploads' URL path
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Serve other static files from the 'public' directory (e.g., index.html, favicon.ico)
app.use(express.static('public'));


// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/items', require('./routes/items'));
app.use('/api/events', require('./routes/events'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/event-requests', require('./routes/event-requests'));

// Basic route for testing
app.get('/', (req, res) => res.send('API Running'));

const PORT = process.env.PORT || 3001; // Use port from environment variable or 3001
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));