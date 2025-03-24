// routes/userRoutes.js - Routes for user endpoints

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController.js');

// GET all users or search with filters
router.get('/', userController.getAllUsers);

// GET a specific user by ID
router.get('/:id', userController.getUserById);

// POST create a new user
router.post('/', userController.createUser);

// PUT update an existing user
router.put('/:id', userController.updateUser);

// DELETE a user
router.delete('/:id', userController.deleteUser);

// GET search users by text
router.get('/search', userController.searchUsers);

module.exports = router;