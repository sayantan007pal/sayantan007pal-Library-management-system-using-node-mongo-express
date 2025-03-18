// controllers/borrowController.js - Enhanced controller for book borrowing operations

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
      transactionId,
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
    if (transactionId) filter.transactionId = transactionId;
    
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
      .populate('user', 'userId name email')
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
      .populate('user', 'userId name email')
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
    const { userId, bookId, dueDate, bookCondition, notes } = req.body;
    
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
      status: 'borrowed',
      bookCondition: {
        checkedOut: bookCondition || 'good'
      },
      notes: notes || ''
    });
    
    // Save borrow record
    const savedRecord = await borrowRecord.save();
    
    // Update book's available quantity
    book.availableQuantity -= 1;
    await book.save();
    
    // Update user's borrowed books and borrowing history
    user.borrowedBooks.push(savedRecord._id);
    user.borrowHistory.totalBooksBorrowed += 1;
    user.borrowHistory.lastBorrowDate = new Date();
    await user.save();
    
    // Populate user and book details
    const populatedRecord = await BorrowRecord.findById(savedRecord._id)
      .populate('user', 'userId name email')
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
    const { status, dueDate, notes, bookCondition } = req.body;
    
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
    if (bookCondition) borrowRecord.bookCondition.checkedOut = bookCondition;
    
    // Save updated record
    const updatedRecord = await borrowRecord.save();
    
    // Populate user and book details
    const populatedRecord = await BorrowRecord.findById(updatedRecord._id)
      .populate('user', 'userId name email')
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
    const { bookCondition } = req.body;
    
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
    
    // Determine fine reason
    let fineReason = null;
    if (fineAmount > 0) {
      fineReason = 'late';
    }
    
    // Check if book is damaged or lost
    if (bookCondition === 'damaged' || bookCondition === 'lost') {
      fineReason = bookCondition;
      
      if (bookCondition === 'lost') {
        borrowRecord.status = 'lost';
        // Don't increment available quantity for lost books
        book.availableQuantity -= 1;
        book.quantity -= 1;
        await book.save();
      }
    }
    
    // Update user record
    const user = await User.findById(borrowRecord.user);
    
    // Remove this book from active borrowings
    user.borrowedBooks = user.borrowedBooks.filter(id => 
      id.toString() !== borrowRecord._id.toString()
    );
    
    // Update borrow history
    user.borrowHistory.totalBooksReturned += 1;
    
    if (fineAmount > 0) {
      user.borrowHistory.totalFinesOutstanding += fineAmount;
    }
    
    await user.save();
    
    // Update borrow record
    borrowRecord.status = bookCondition === 'lost' ? 'lost' : 'returned';
    borrowRecord.returnDate = new Date();
    borrowRecord.fine.amount = fineAmount;
    if (fineReason) borrowRecord.fine.reason = fineReason;
    
    if (bookCondition) {
      borrowRecord.bookCondition.returned = bookCondition;
    }
    
    // Save updated record
    await borrowRecord.save();
    
    // Populate user and book details
    const populatedRecord = await BorrowRecord.findById(borrowRecord._id)
      .populate('user', 'userId name email')
      .populate('book', 'title author isbn');
    
    return res.status(200).json(
      successResponse(200, 'Book returned successfully', populatedRecord)
    );
  } catch (error) {
    next(error);
  }
};

// Renew a book loan
exports.renewBook = async (req, res, next) => {
  try {
    const { extensionDays } = req.body;
    
    // Find the borrow record
    const borrowRecord = await BorrowRecord.findById(req.params.id);
    if (!borrowRecord) {
      return res.status(404).json(
        errorResponse(404, 'Borrow record not found')
      );
    }
    
    // Check if book can be renewed
    if (borrowRecord.status !== 'borrowed' || borrowRecord.isOverdue()) {
      return res.status(400).json(
        errorResponse(400, 'Book cannot be renewed. It is either already returned, overdue, or in another status')
      );
    }
    
    // Renew the book
    const renewed = borrowRecord.renewBook(extensionDays || 7);
    
    if (!renewed) {
      return res.status(400).json(
        errorResponse(400, 'Failed to renew book')
      );
    }
    
    // Save updated record
    await borrowRecord.save();
    
    // Populate user and book details
    const populatedRecord = await BorrowRecord.findById(borrowRecord._id)
      .populate('user', 'userId name email')
      .populate('book', 'title author isbn');
    
    return res.status(200).json(
      successResponse(200, 'Book renewed successfully', populatedRecord)
    );
  } catch (error) {
    next(error);
  }
};

// Pay fine
exports.payFine = async (req, res, next) => {
  try {
    const { paymentMethod, amount } = req.body;
    
    // Find the borrow record
    const borrowRecord = await BorrowRecord.findById(req.params.id);
    if (!borrowRecord) {
      return res.status(404).json(
        errorResponse(404, 'Borrow record not found')
      );
    }
    
    // Check if there's a fine to pay
    if (borrowRecord.fine.amount <= 0) {
      return res.status(400).json(
        errorResponse(400, 'No fine to pay for this record')
      );
    }
    
    // Check if fine is already paid
    if (borrowRecord.fine.paid) {
      return res.status(400).json(
        errorResponse(400, 'Fine is already paid')
      );
    }
    
    // Validate payment amount
    const paymentAmount = parseFloat(amount) || borrowRecord.fine.amount;
    if (paymentAmount < borrowRecord.fine.amount) {
      return res.status(400).json(
        errorResponse(400, 'Payment amount must cover the full fine')
      );
    }
    
    // Update fine status
    borrowRecord.fine.paid = true;
    borrowRecord.fine.paidDate = new Date();
    borrowRecord.fine.paymentMethod = paymentMethod || 'cash';
    
    // Save updated record
    await borrowRecord.save();
    
    // Update user's fine records
    const user = await User.findById(borrowRecord.user);
    user.borrowHistory.totalFinesPaid += borrowRecord.fine.amount;
    user.borrowHistory.totalFinesOutstanding -= borrowRecord.fine.amount;
    await user.save();
    
    // Populate user and book details
    const populatedRecord = await BorrowRecord.findById(borrowRecord._id)
      .populate('user', 'userId name email')
      .populate('book', 'title author isbn');
    
    return res.status(200).json(
      successResponse(200, 'Fine paid successfully', populatedRecord)
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
    .populate('user', 'userId name email')
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

// Get user's borrow history
exports.getUserBorrowHistory = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(
        errorResponse(404, 'User not found')
      );
    }
    
    // Get all borrow records for this user
    const borrowRecords = await BorrowRecord.find({ user: userId })
      .populate('book', 'title author isbn publishedYear')
      .sort({ borrowDate: -1 });
    
    // Group by status
    const borrowStats = {
      active: borrowRecords.filter(record => ['borrowed', 'overdue'].includes(record.status)),
      returned: borrowRecords.filter(record => record.status === 'returned'),
      overdue: borrowRecords.filter(record => record.status === 'overdue'),
      lost: borrowRecords.filter(record => record.status === 'lost'),
      summary: {
        totalBorrowed: borrowRecords.length,
        currentlyBorrowed: borrowRecords.filter(record => ['borrowed', 'overdue'].includes(record.status)).length,
        returned: borrowRecords.filter(record => record.status === 'returned').length,
        overdue: borrowRecords.filter(record => record.status === 'overdue').length,
        lost: borrowRecords.filter(record => record.status === 'lost').length,
        totalFines: borrowRecords.reduce((sum, record) => sum + record.fine.amount, 0),
        unpaidFines: borrowRecords.reduce((sum, record) => 
          record.fine.amount > 0 && !record.fine.paid ? sum + record.fine.amount : sum, 0
        )
      }
    };
    
    return res.status(200).json(
      successResponse(200, 'User borrow history retrieved successfully', borrowStats)
    );
  } catch (error) {
    next(error);
  }
};