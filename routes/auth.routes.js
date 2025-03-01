const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authJwt } = require('../middleware');

/**
 * Authentication Routes
 */

// Register a new user
router.post('/signup', authController.signup);

// Login a user
router.post('/login', authController.login);

// Get user profile (protected route)
router.get('/profile', [authJwt.verifyToken], authController.getUserProfile);

// Update user profile (protected route)
router.put('/profile', [authJwt.verifyToken], authController.updateUserProfile);

module.exports = router;
