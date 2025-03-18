// test-script.js
// This script will add a test book to your database

const mongoose = require('mongoose');
const Book = require('./models/Book');
require('dotenv').config();

// MongoDB connection string
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/library_management';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB successfully');
    
    try {
      // Create a test book
      const testBook = new Book({
        title: "Test Book",
        author: "Test Author",
        isbn: "978-3-16-148410-0",
        publishedYear: 2023,
        genre: "Fiction",
        quantity: 5,
        description: "This is a test book."
      });
      
      // Save the book to the database
      const savedBook = await testBook.save();
      console.log('Book saved successfully:', savedBook);
      
    } catch (error) {
      console.error('Error saving book:', error.message);
    } finally {
      // Close the connection
      mongoose.connection.close();
      console.log('Connection closed');
    }
  })
  .catch(error => {
    console.error('MongoDB connection error:', error);
  });