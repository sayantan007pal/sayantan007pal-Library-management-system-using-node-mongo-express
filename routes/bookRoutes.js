// routes/bookRoutes.js - Routes for book endpoints

const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

// GET all books or search with filters
router.get('/', bookController.getAllBooks);

// GET a specific book by ID
router.get('/id', bookController.getBookById);

// POST create a new book
router.post('/', bookController.createBook);

// PUT update an existing book
router.put('/id', bookController.updateBook);

// DELETE a book
router.delete('/id', bookController.deleteBook);

// GET search books by text
router.get('/search', bookController.searchBooks);

module.exports = router;