// index.js
require('dotenv').config();
const express = require('express');
const path = require('path');

const cors = require('cors'); // 1. Import cors

const app = express();
app.use(express.json());
app.use(cors()); // 2. Use cors middleware

// Serve static files from the 'public' directory
// Add middleware to explicitly set Content-Type for PDF files
app.use((req, res, next) => {
    if (req.path.endsWith('.pdf')) {
        res.set('Content-Type', 'application/pdf');
    }
    next();
});
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'))); // Explicitly serve uploads
app.use(express.static('public')); // Serve other static files (like index.html, etc. if needed)


// --- CONNECT ROUTERS ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/items', require('./routes/items'));
app.use('/api/events', require('./routes/events'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/templates', require('./routes/templates'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));