const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authJwt } = require('../middleware');

/**
 * Authentication Routes
 */

// Page routes
router.get('/login', (req, res) => {
    res.render('pages/login', { 
        title: 'FreshShare - Login'
    });
});

router.get('/signup', (req, res) => {
    res.render('pages/signup', { 
        title: 'FreshShare - Sign Up'
    });
});

router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

// API routes
// Register a new user
router.post('/api/auth/signup', authController.signup);

// Login a user
router.post('/api/auth/login', authController.login);

// Get user profile (protected route)
router.get('/api/auth/profile', [authJwt.verifyToken], authController.getUserProfile);

// Update user profile (protected route)
router.put('/api/auth/profile', [authJwt.verifyToken], authController.updateUserProfile);

module.exports = router;
