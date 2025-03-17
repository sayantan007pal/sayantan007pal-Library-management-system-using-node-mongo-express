// controllers/userController.js - Controller for user-related operations

const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Get all users with optional filtering
exports.getAllUsers = async (req, res, next) => {
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
};

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
exports.createUser = async (req, res, next) => {
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
};

// Update a user
exports.updateUser = async (req, res, next) => {
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
};

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
exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    const { page = 1, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json(
        errorResponse(400, 'Search query is required')
      );
    }
    
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
};