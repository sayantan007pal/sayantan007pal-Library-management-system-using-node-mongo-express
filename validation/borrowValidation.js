// validation/borrowValidation.js
const Joi = require('joi');
const mongoose = require('mongoose');

// Helper to validate MongoDB ObjectId
const objectIdValidator = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

// Create borrow record validation schema
const createBorrowSchema = Joi.object({
  userId: Joi.string().custom(objectIdValidator, 'MongoDB ObjectId Validation').required(),
  bookId: Joi.string().custom(objectIdValidator, 'MongoDB ObjectId Validation').required(),
  dueDate: Joi.date().min('now').messages({
    'date.min': 'Due date must be in the future'
  }),
  bookCondition: Joi.string().valid('excellent', 'good', 'fair', 'poor'),
  notes: Joi.string().max(500)
});

// Update borrow record validation schema
const updateBorrowSchema = Joi.object({
  status: Joi.string().valid('borrowed', 'returned', 'overdue', 'lost'),
  dueDate: Joi.date().min('now').messages({
    'date.min': 'Due date must be in the future'
  }),
  bookCondition: Joi.string().valid('excellent', 'good', 'fair', 'poor'),
  notes: Joi.string().max(500)
});

// Return book validation schema
const returnBookSchema = Joi.object({
  bookCondition: Joi.string().valid('excellent', 'good', 'fair', 'poor', 'damaged', 'lost').required()
});

// Renew book validation schema
const renewBookSchema = Joi.object({
  extensionDays: Joi.number().integer().min(1).max(30).default(7)
});

// Pay fine validation schema
const payFineSchema = Joi.object({
  paymentMethod: Joi.string().valid('cash', 'card', 'online', 'waived').required(),
  amount: Joi.number().min(0.01).precision(2)
});

// Get all borrow records query validation schema
const getAllBorrowRecordsSchema = Joi.object({
  userId: Joi.string().custom(objectIdValidator, 'MongoDB ObjectId Validation'),
  bookId: Joi.string().custom(objectIdValidator, 'MongoDB ObjectId Validation'),
  status: Joi.string().valid('borrowed', 'returned', 'overdue', 'lost'),
  fromDate: Joi.date(),
  toDate: Joi.date().greater(Joi.ref('fromDate')).messages({
    'date.greater': 'toDate must be after fromDate'
  }),
  transactionId: Joi.string(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('borrowDate', 'dueDate', 'returnDate', 'status').default('borrowDate'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true,
      // Convert string values to their appropriate type when possible
      convert: true
    });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Validation error',
        error: errorMessage
      });
    }
    
    next();
  };
};

// Validation middleware for query parameters
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query, { 
      abortEarly: false,
      stripUnknown: false, // Keep query parameters for flexibility
      convert: true
    });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Validation error',
        error: errorMessage
      });
    }
    
    next();
  };
};

module.exports = {
  validateCreateBorrow: validateRequest(createBorrowSchema),
  validateUpdateBorrow: validateRequest(updateBorrowSchema),
  validateReturnBook: validateRequest(returnBookSchema),
  validateRenewBook: validateRequest(renewBookSchema),
  validatePayFine: validateRequest(payFineSchema),
  validateGetAllBorrowRecords: validateQuery(getAllBorrowRecordsSchema)
};