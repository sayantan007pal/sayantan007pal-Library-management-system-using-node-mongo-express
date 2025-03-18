// middlewares/errorHandler.js - Global error handling middleware

const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
  
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errors
      });
    }
  
    // Mongoose duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(409).json({
        success: false,
        message: `Duplicate field value: ${field}. This value is already taken.`
      });
    }
  
    // JWT error
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.'
      });
    }
  
    // For all other errors
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Server Error',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  };
  
  module.exports = errorHandler;
  
  