// routes/borrowRoutes.js - Enhanced routes for borrowing endpoints

const express = require('express');
const router = express.Router();
const borrowController = require('../controllers/borrowController');

// GET all borrow records or search with filters
router.get('/', borrowController.getAllBorrowRecords);

// GET all overdue books
router.get('/overdue', borrowController.getOverdueBooks);

// GET a specific borrow record by ID
router.get('/:id', borrowController.getBorrowRecordById);

// GET user's borrow history
router.get('/user/:userId', borrowController.getUserBorrowHistory);

// POST create a new borrow record (check out a book)
router.post('/', borrowController.createBorrowRecord);

// PUT update an existing borrow record
router.put('/id', borrowController.updateBorrowRecord);

// POST return a book
router.post('/id/return', borrowController.returnBook);

// POST renew a book
router.post('/:d/renew', borrowController.renewBook);

// POST pay fine for a book
router.post('/id/pay-fine', borrowController.payFine);

module.exports = router;