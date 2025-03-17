// controllers/borrowController.js - Controller for book borrowing operations

const BorrowRecord = require('../models/BorrowRecord');
const Book = require('../models/Book');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Get all borrow records with optional filtering
exports.getAllBorrowRecords = async (req, res, next) => {
  try {
    const { 
      userId, bookId, status,
      fromDate, toDate,
      page = 1, 
      limit = 10,
      sortBy = 'borrowDate',
      sortOrder = 'desc'
    } = req.query;

    // Build query filters
    const filter = {};
    
    if (userId) filter.user = userId;
    if (bookId) filter.book = bookId;
    if (status) filter.status = status;
    
    // Date range filtering
    if (fromDate || toDate) {
      filter.borrowDate = {};
      if (fromDate) filter.borrowDate.$gte = new Date(fromDate);
      if (toDate) filter.borrowDate.$lte = new Date(toDate);
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination and sorting
    const borrowRecords = await BorrowRecord.find(filter)
      .populate('user', 'name email')
      .populate('book', 'title author isbn')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalRecords = await BorrowRecord.countDocuments(filter);
    
    // Update status for any overdue books
    for (const record of borrowRecords) {
      if (record.isOverdue() && record.status === 'borrowed') {
        record.status = 'overdue';
        await record.save();
      }
    }
    
    // Send response
    return res.status(200).json(
      successResponse(200, 'Borrow records retrieved successfully', borrowRecords, {
        pagination: {
          total: totalRecords,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalRecords / parseInt(limit))
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

// Get a specific borrow record by ID
exports.getBorrowRecordById = async (req, res, next) => {
  try {
    const borrowRecord = await BorrowRecord.findById(req.params.id)
      .populate('user', 'name email')
      .populate('book', 'title author isbn');
    
    if (!borrowRecord) {
      return res.status(404).json(
        errorResponse(404, 'Borrow record not found')
      );
    }
    
    // Update status if overdue
    if (borrowRecord.isOverdue() && borrowRecord.status === 'borrowed') {
      borrowRecord.status = 'overdue';
      await borrowRecord.save();
    }
    
    return res.status(200).json(
      successResponse(200, 'Borrow record retrieved successfully', borrowRecord)
    );
  } catch (error) {
    next(error);
  }
};

// Create a new borrow record (check out a book)
exports.createBorrowRecord = async (req, res, next) => {
  try {
    const { userId, bookId, dueDate } = req.body;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(
        errorResponse(404, 'User not found')
      );
    }
    
    // Check if user's membership is valid
    if (!user.isMembershipValid) {
      return res.status(400).json(
        errorResponse(400, 'User membership is not valid or has expired')
      );
    }
    
    // Check if book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json(
        errorResponse(404, 'Book not found')
      );
    }
    
    // Check if book is available
    if (book.availableQuantity <= 0) {
      return res.status(400).json(
        errorResponse(400, 'Book is not available for borrowing')
      );
    }
    
    // Create borrow record
    const borrowRecord = new BorrowRecord({
      user: userId,
      book: bookId,
      borrowDate: new Date(),
      dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default 14 days
      status: 'borrowed'
    });
    
    // Save borrow record
    const savedRecord = await borrowRecord.save();
    
    // Update book's available quantity
    book.availableQuantity -= 1;
    await book.save();
    
    // Update user's borrowed books
    user.borrowedBooks.push(savedRecord._id);
    await user.save();
    
    // Populate user and book details
    const populatedRecord = await BorrowRecord.findById(savedRecord._id)
      .populate('user', 'name email')
      .populate('book', 'title author isbn');
    
    return res.status(201).json(
      successResponse(201, 'Book borrowed successfully', populatedRecord)
    );
  } catch (error) {
    next(error);
  }
};

// Update a borrow record
exports.updateBorrowRecord = async (req, res, next) => {
  try {
    const { status, dueDate, notes } = req.body;
    
    // Find the borrow record
    const borrowRecord = await BorrowRecord.findById(req.params.id);
    if (!borrowRecord) {
      return res.status(404).json(
        errorResponse(404, 'Borrow record not found')
      );
    }
    
    // Update fields
    if (status) borrowRecord.status = status;
    if (dueDate) borrowRecord.dueDate = dueDate;
    if (notes) borrowRecord.notes = notes;
    
    // Save updated record
    const updatedRecord = await borrowRecord.save();
    
    // Populate user and book details
    const populatedRecord = await BorrowRecord.findById(updatedRecord._id)
      .populate('user', 'name email')
      .populate('book', 'title author isbn');
    
    return res.status(200).json(
      successResponse(200, 'Borrow record updated successfully', populatedRecord)
    );
  } catch (error) {
    next(error);
  }
};

// Return a book
exports.returnBook = async (req, res, next) => {
  try {
    // Find the borrow record
    const borrowRecord = await BorrowRecord.findById(req.params.id);
    if (!borrowRecord) {
      return res.status(404).json(
        errorResponse(404, 'Borrow record not found')
      );
    }
    
    // Check if book is already returned
    if (borrowRecord.status === 'returned') {
      return res.status(400).json(
        errorResponse(400, 'Book is already returned')
      );
    }
    
    // Update book's available quantity
    const book = await Book.findById(borrowRecord.book);
    book.availableQuantity += 1;
    await book.save();
    
    // Calculate fine if any
    const fineAmount = borrowRecord.calculateFine();
    
    // Update borrow record
    borrowRecord.status = 'returned';
    borrowRecord.returnDate = new Date();
    borrowRecord.fine.amount = fineAmount;
    
    // Save updated record
    await borrowRecord.save();
    
    // Update user's borrowed books (remove this book)
    const user = await User.findById(borrowRecord.user);
    user.borrowedBooks = user.borrowedBooks.filter(id => 
      id.toString() !== borrowRecord._id.toString()
    );
    await user.save();
    
    // Populate user and book details
    const populatedRecord = await BorrowRecord.findById(borrowRecord._id)
      .populate('user', 'name email')
      .populate('book', 'title author isbn');
    
    return res.status(200).json(
      successResponse(200, 'Book returned successfully', populatedRecord)
    );
  } catch (error) {
    next(error);
  }
};

// Get all overdue books
exports.getOverdueBooks = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // Find all overdue books (status is 'borrowed' AND due date is past)
    const overdueRecords = await BorrowRecord.find({
      status: 'borrowed',
      dueDate: { $lt: new Date() }
    })
    .populate('user', 'name email')
    .populate('book', 'title author isbn')
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));
    
    // Update status to 'overdue'
    for (const record of overdueRecords) {
      record.status = 'overdue';
      await record.save();
    }
    
    // Count total overdue books
    const totalOverdue = await BorrowRecord.countDocuments({
      status: 'overdue'
    });
    
    return res.status(200).json(
      successResponse(200, 'Overdue books retrieved successfully', overdueRecords, {
        pagination: {
          total: totalOverdue,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalOverdue / parseInt(limit))
        }
      })
    );
  } catch (error) {
    next(error);
  }
};