// controllers/bookController.js - Controller for book-related operations

const Book = require('../models/Book');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const Joi = require('joi');

// Validation schemas
const bookValidationSchema = Joi.object({
  title: Joi.string().trim().required().messages({
    'string.empty': 'Book title is required',
    'any.required': 'Book title is required'
  }),
  author: Joi.string().trim().required().messages({
    'string.empty': 'Author name is required',
    'any.required': 'Author name is required'
  }),
  isbn: Joi.string().trim().required().messages({
    'string.empty': 'ISBN is required',
    'any.required': 'ISBN is required'
  }),
  publishedYear: Joi.number().integer(),
  genre: Joi.array().items(Joi.string().required()).required().messages({
    'array.base': 'Genre must be an array',
    'array.includesRequiredUnknowns': 'Genre items cannot be empty',
    'any.required': 'Genre is required'
  }),
  quantity: Joi.number().integer().min(0).default(1).messages({
    'number.min': 'Quantity cannot be negative'
  }),
  availableQuantity: Joi.number().integer().min(0).messages({
    'number.min': 'Available quantity cannot be negative'
  }),
  description: Joi.string().trim().allow('', null),
  location: Joi.object({
    shelf: Joi.string().trim().allow('', null),
    section: Joi.string().trim().allow('', null)
  }).allow(null),
  coverImage: Joi.string().uri().allow('', null)
});

// Validation middleware
const validateBook = (req, res, next) => {
  const { error } = bookValidationSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    return res.status(400).json(
      errorResponse(400, 'Validation error', errorMessages)
    );
  }
  
  next();
};

// Validation for book update (partial updates allowed)
const updateBookValidationSchema = Joi.object({
  title: Joi.string().trim().messages({
    'string.empty': 'Book title cannot be empty'
  }),
  author: Joi.string().trim().messages({
    'string.empty': 'Author name cannot be empty'
  }),
  isbn: Joi.string().trim().messages({
    'string.empty': 'ISBN cannot be empty'
  }),
  publishedYear: Joi.number().integer(),
  genre: Joi.array().items(Joi.string()).messages({
    'array.base': 'Genre must be an array',
    'array.includesRequiredUnknowns': 'Genre items cannot be empty'
  }),
  quantity: Joi.number().integer().min(0).messages({
    'number.min': 'Quantity cannot be negative'
  }),
  availableQuantity: Joi.number().integer().min(0).messages({
    'number.min': 'Available quantity cannot be negative'
  }),
  description: Joi.string().trim().allow('', null),
  location: Joi.object({
    shelf: Joi.string().trim().allow('', null),
    section: Joi.string().trim().allow('', null)
  }).allow(null),
  coverImage: Joi.string().uri().allow('', null)
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Validation middleware for updates
const validateBookUpdate = (req, res, next) => {
  const { error } = updateBookValidationSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    return res.status(400).json(
      errorResponse(400, 'Validation error', errorMessages)
    );
  }
  
  next();
};

// Validation schema for query parameters
const queryValidationSchema = Joi.object({
  title: Joi.string().trim(),
  author: Joi.string().trim(),
  genre: Joi.string().trim(),
  isbn: Joi.string().trim(),
  availableOnly: Joi.string().valid('true', 'false'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('title', 'author', 'publishedYear', 'genre', 'quantity', 'availableQuantity').default('title'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
});

// Validation middleware for query parameters
const validateQuery = (req, res, next) => {
  const { error, value } = queryValidationSchema.validate(req.query, { abortEarly: false });
  
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    return res.status(400).json(
      errorResponse(400, 'Invalid query parameters', errorMessages)
    );
  }
  
  // Replace the query with validated values
  req.query = value;
  next();
};

// Search query validation
const searchValidationSchema = Joi.object({
  q: Joi.string().required().messages({
    'string.empty': 'Search query cannot be empty',
    'any.required': 'Search query is required'
  }),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

// Validation middleware for search
const validateSearch = (req, res, next) => {
  const { error, value } = searchValidationSchema.validate(req.query, { abortEarly: false });
  
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    return res.status(400).json(
      errorResponse(400, 'Invalid search parameters', errorMessages)
    );
  }
  
  // Replace the query with validated values
  req.query = value;
  next();
};

// Get all books with optional filtering
exports.getAllBooks = [validateQuery, async (req, res, next) => {
  try {
    const { 
      title, author, genre, 
      isbn, availableOnly,
      page = 1, 
      limit = 10,
      sortBy = 'title',
      sortOrder = 'asc'
    } = req.query;

    // Build query filters
    const filter = {};
    
    if (title) filter.title = { $regex: title, $options: 'i' };
    if (author) filter.author = { $regex: author, $options: 'i' };
    if (genre) filter.genre = { $regex: genre, $options: 'i' };
    if (isbn) filter.isbn = isbn;
    if (availableOnly === 'true') filter.availableQuantity = { $gt: 0 };

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination and sorting
    const books = await Book.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalBooks = await Book.countDocuments(filter);
    
    // Send response
    return res.status(200).json(
      successResponse(200, 'Books retrieved successfully', books, {
        pagination: {
          total: totalBooks,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalBooks / parseInt(limit))
        }
      })
    );
  } catch (error) {
    next(error);
  }
}];

// Get a single book by ID
exports.getBookById = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    
    if (!book) {
      return res.status(404).json(
        errorResponse(404, 'Book not found')
      );
    }
    
    return res.status(200).json(
      successResponse(200, 'Book retrieved successfully', book)
    );
  } catch (error) {
    next(error);
  }
};

// Create a new book
exports.createBook = [validateBook, async (req, res, next) => {
  try {
    // Check if book with same ISBN already exists
    const existingBook = await Book.findOne({ isbn: req.body.isbn });
    
    if (existingBook) {
      return res.status(409).json(
        errorResponse(409, 'Book with this ISBN already exists')
      );
    }
    
    // Create new book
    const book = new Book(req.body);
    const savedBook = await book.save();
    
    return res.status(201).json(
      successResponse(201, 'Book created successfully', savedBook)
    );
  } catch (error) {
    next(error);
  }
}];

// Update a book
exports.updateBook = [validateBookUpdate, async (req, res, next) => {
  try {
    // Find the book to update
    const bookToUpdate = await Book.findById(req.params.id);
    
    if (!bookToUpdate) {
      return res.status(404).json(
        errorResponse(404, 'Book not found')
      );
    }
    
    // Check if trying to update ISBN to one that already exists
    if (req.body.isbn && req.body.isbn !== bookToUpdate.isbn) {
      const bookWithIsbn = await Book.findOne({ isbn: req.body.isbn });
      
      if (bookWithIsbn) {
        return res.status(409).json(
          errorResponse(409, 'Book with this ISBN already exists')
        );
      }
    }
    
    // Update book
    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    return res.status(200).json(
      successResponse(200, 'Book updated successfully', updatedBook)
    );
  } catch (error) {
    next(error);
  }
}];

// Delete a book
exports.deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    
    if (!book) {
      return res.status(404).json(
        errorResponse(404, 'Book not found')
      );
    }

    // Check if any books are currently borrowed
    if (book.quantity !== book.availableQuantity) {
      return res.status(400).json(
        errorResponse(400, 'Cannot delete book while copies are borrowed')
      );
    }
    
    await Book.findByIdAndDelete(req.params.id);
    
    return res.status(200).json(
      successResponse(200, 'Book deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Search books by text
exports.searchBooks = [validateSearch, async (req, res, next) => {
  try {
    const { q } = req.query;
    const { page = 1, limit = 10 } = req.query;
    
    // Use MongoDB text search
    const books = await Book.find(
      { $text: { $search: q } },
      { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" } })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));
    
    const totalBooks = await Book.countDocuments({ $text: { $search: q } });
    
    return res.status(200).json(
      successResponse(200, 'Search results', books, {
        pagination: {
          total: totalBooks,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalBooks / parseInt(limit))
        }
      })
    );
  } catch (error) {
    next(error);
  }
}];