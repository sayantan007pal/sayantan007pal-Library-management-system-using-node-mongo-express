// config/db.js - MongoDB connection setup

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Get the MongoDB connection string from environment variables
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/library_management';

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit the process with failure
  });

// Export the mongoose connection
module.exports = mongoose.connection;