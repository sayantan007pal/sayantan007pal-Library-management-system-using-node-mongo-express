// controllers/userController.js - Controller for user-related operations with Joi validation

const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const Joi = require('joi');

// Validation schemas
const userValidationSchema = Joi.object({
  name: Joi.string().required().trim().messages({
    'string.empty': 'Name is required',
    'any.required': 'Name is required'
  }),
  email: Joi.string().email().required().trim().lowercase().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required',
    'any.required': 'Email is required'
  }),
  phone: Joi.string().trim().allow(''),
  address: Joi.object({
    street: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    zipCode: Joi.string().allow(''),
    country: Joi.string().allow('')
  }),
  membershipType: Joi.string().valid('regular', 'premium', 'student', 'staff').default('regular'),
  membershipDate: Joi.date().default(Date.now),
  membershipExpiry: Joi.date(),
  isActive: Joi.boolean().default(true),
  notes: Joi.string().allow(''),
  preferences: Joi.object({
    receiveNotifications: Joi.boolean().default(true),
    notificationChannel: Joi.string().valid('email', 'sms', 'both', 'none').default('email'),
    favoriteGenres: Joi.array().items(Joi.string())
  }),
  userId: Joi.string() // Only for update operations
}).unknown(false);

const queryValidationSchema = Joi.object({
  name: Joi.string(),
  email: Joi.string(),
  membershipType: Joi.string().valid('regular', 'premium', 'student', 'staff'),
  isActive: Joi.string().valid('true', 'false'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).default(10),
  sortBy: Joi.string().default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
});

const searchValidationSchema = Joi.object({
  q: Joi.string().required().messages({
    'string.empty': 'Search query is required',
    'any.required': 'Search query is required'
  }),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).default(10)
});

// Validation middleware
const validateUserData = (req, res, next) => {
  const { error, value } = userValidationSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const validationErrors = error.details.map(detail => detail.message);
    return res.status(400).json(
      errorResponse(400, 'Validation error', validationErrors)
    );
  }
  
  req.body = value; // Use the validated and sanitized data
  next();
};

const validateQuery = (req, res, next) => {
  const { error, value } = queryValidationSchema.validate(req.query, { abortEarly: false });
  
  if (error) {
    const validationErrors = error.details.map(detail => detail.message);
    return res.status(400).json(
      errorResponse(400, 'Query validation error', validationErrors)
    );
  }
  
  req.query = value; // Use the validated and sanitized query params
  next();
};

const validateSearchQuery = (req, res, next) => {
  const { error, value } = searchValidationSchema.validate(req.query, { abortEarly: false });
  
  if (error) {
    const validationErrors = error.details.map(detail => detail.message);
    return res.status(400).json(
      errorResponse(400, 'Search validation error', validationErrors)
    );
  }
  
  req.query = value; // Use the validated and sanitized search params
  next();
};

// Get all users with optional filtering
exports.getAllUsers = [validateQuery, async (req, res, next) => {
  try {
    const { 
      name, email, membershipType, 
      isActive, 
      page = 1, 
      limit = 10,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Build query filters
    const filter = {};
    
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (email) filter.email = { $regex: email, $options: 'i' };
    if (membershipType) filter.membershipType = membershipType;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination and sorting
    const users = await User.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);
    
    // Send response
    return res.status(200).json(
      successResponse(200, 'Users retrieved successfully', users, {
        pagination: {
          total: totalUsers,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalUsers / parseInt(limit))
        }
      })
    );
  } catch (error) {
    next(error);
  }
}];

// Get a single user by ID
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate({
        path: 'borrowedBooks',
        populate: { path: 'book', select: 'title author isbn' }
      });
    
    if (!user) {
      return res.status(404).json(
        errorResponse(404, 'User not found')
      );
    }
    
    return res.status(200).json(
      successResponse(200, 'User retrieved successfully', user)
    );
  } catch (error) {
    next(error);
  }
};

// Create a new user
exports.createUser = [validateUserData, async (req, res, next) => {
  try {
    // Check if user with same email already exists
    const existingUser = await User.findOne({ email: req.body.email });
    
    if (existingUser) {
      return res.status(409).json(
        errorResponse(409, 'User with this email already exists')
      );
    }
    
    // Create new user
    const user = new User(req.body);
    const savedUser = await user.save();
    
    return res.status(201).json(
      successResponse(201, 'User created successfully', savedUser)
    );
  } catch (error) {
    next(error);
  }
}];

// Update a user
exports.updateUser = [validateUserData, async (req, res, next) => {
  try {
    // Find the user to update
    const userToUpdate = await User.findById(req.params.id);
    
    if (!userToUpdate) {
      return res.status(404).json(
        errorResponse(404, 'User not found')
      );
    }
    
    // Check if trying to update email to one that already exists
    if (req.body.email && req.body.email !== userToUpdate.email) {
      const userWithEmail = await User.findOne({ email: req.body.email });
      
      if (userWithEmail) {
        return res.status(409).json(
          errorResponse(409, 'User with this email already exists')
        );
      }
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    return res.status(200).json(
      successResponse(200, 'User updated successfully', updatedUser)
    );
  } catch (error) {
    next(error);
  }
}];

// Delete a user
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('borrowedBooks');
    
    if (!user) {
      return res.status(404).json(
        errorResponse(404, 'User not found')
      );
    }

    // Check if user has any active borrowed books
    const activeBorrows = user.borrowedBooks.filter(borrow => 
      borrow.status === 'borrowed' || borrow.status === 'overdue'
    );
    
    if (activeBorrows.length > 0) {
      return res.status(400).json(
        errorResponse(400, 'Cannot delete user while they have active borrowed books')
      );
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    return res.status(200).json(
      successResponse(200, 'User deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Search users by text
exports.searchUsers = [validateSearchQuery, async (req, res, next) => {
  try {
    const { q } = req.query;
    const { page = 1, limit = 10 } = req.query;
    
    // Use MongoDB text search
    const users = await User.find(
      { $text: { $search: q } },
      { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" } })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));
    
    const totalUsers = await User.countDocuments({ $text: { $search: q } });
    
    return res.status(200).json(
      successResponse(200, 'Search results', users, {
        pagination: {
          total: totalUsers,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalUsers / parseInt(limit))
        }
      })
    );
  } catch (error) {
    next(error);
  }
}];

module.exports = {
  ...exports,
  validateUserData,
  validateQuery,
  validateSearchQuery
};