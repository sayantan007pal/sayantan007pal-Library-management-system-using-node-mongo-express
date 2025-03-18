// middlewares/validateRequest.js - Request validation middleware
  
const validateRequest = (schema) => {
    return (req, res, next) => {
      // If no schema provided, skip validation
      if (!schema) return next();
  
      // Determine which part of the request to validate
      const data = req.body;
      
      try {
        // Validate the request data against the schema
        const { error } = schema.validate(data);
        
        if (error) {
          return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: error.details.map(detail => detail.message)
          });
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  };
  
  module.exports = validateRequest;