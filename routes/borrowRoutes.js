// routes/borrowRoutes.js - Routes for borrowing endpoints

const express = require('express');
const router = express.Router();
const borrowController = require('../controllers/borrowController');

// GET all borrow records or search with filters
router.get('/', borrowController.getAllBorrowRecords);

// GET a specific borrow record by ID
router.get('/:id', borrowController.getBorrowRecordById);

// POST create a new borrow record (check out a book)
router.post('/', borrowController.createBorrowRecord);

// PUT update an existing borrow record
router.put('/:id', borrowController.updateBorrowRecord);

// POST return a book
router.post('/:id/return', borrowController.returnBook);

// GET all overdue books
router.get('/overdue', borrowController.getOverdueBooks);

module.exports = router;