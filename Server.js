// server.js - Entry point for the application


const open = require('open').default;  
// Import required packages
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Import routes
const bookRoutes = require('./routes/bookRoutes');
const userRoutes = require('./routes/userRoutes');
const borrowRoutes = require('./routes/borrowRoutes');

// Import middleware
const errorHandler = require('./middlewares/errorHandler');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Set up middleware
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Connect to MongoDB
require('./config/db');

// Define a simple root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Library Management System API' });
});

// Use routes
app.use('/api/books', bookRoutes);
app.use('/api/users', userRoutes);
app.use('/api/borrows', borrowRoutes);

// Global error handling middleware
app.use(errorHandler);

// Set port and start server
const PORT = process.env.PORT || 3000;

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// // Serve index.html as default page
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// Start the server
app.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}`);
    await open(`http://localhost:${PORT}/index.html`); // Opens the browser automatically
});


module.exports = app; // Export for testing purposes