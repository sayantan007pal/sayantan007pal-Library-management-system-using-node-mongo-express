// models/Book.js - Book schema and model

const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
  },
  author: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true,
  },
  isbn: {
    type: String,
    required: [true, 'ISBN is required'],
    unique: true,
    trim: true,
  },
  publishedYear: {
    type: Number,
    required: [true, 'Published year is required'],
  },
  genre: {
    type: String,
    required: [true, 'Genre is required'],
    trim: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 1,
  },
  availableQuantity: {
    type: Number,
    min: [0, 'Available quantity cannot be negative'],
    default: function() {
      return this.quantity; // Initially, all books are available
    }
  },
  description: {
    type: String,
    trim: true,
  },
  location: {
    shelf: {
      type: String,
      trim: true,
    },
    section: {
      type: String,
      trim: true,
    }
  },
  coverImage: {
    type: String, // URL to the cover image
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

// Create virtual property for available status
bookSchema.virtual('isAvailable').get(function() {
  return this.availableQuantity > 0;
});


// Create indexes for frequently queried fields
bookSchema.index({ title: 'text', author: 'text', genre: 'text' });
bookSchema.index({ isbn: 1 });


// Export the model
const Book = mongoose.model('Book', bookSchema);
module.exports = Book;