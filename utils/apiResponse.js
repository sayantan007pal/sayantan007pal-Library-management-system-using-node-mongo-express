// utils/apiResponse.js - Standardized API response format

/**
 * Function to create a standardized success response
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {object|array} data - Response data
 * @param {object} meta - Additional metadata (pagination, etc.)
 * @returns {object} Formatted response object
 */
const successResponse = (statusCode = 200, message = 'Success', data = null, meta = {}) => {
    return {
      success: true,
      statusCode,
      message,
      data,
      meta
    };
  };
  
  /**
   * Function to create a standardized error response
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {array} errors - Array of error details
   * @returns {object} Formatted error response object
   */
  const errorResponse = (statusCode = 500, message = 'Error', errors = []) => {
    return {
      success: false,
      statusCode,
      message,
      errors
    };
  };
  
  module.exports = {
    successResponse,
    errorResponse
  };