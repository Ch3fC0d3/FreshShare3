const express = require('express');
const { authJwt } = require('../middleware');
const controller = require('../controllers/email.controller');

const router = express.Router();

// Routes that require authentication
router.get('/check-verification', [authJwt.verifyToken], controller.checkEmailVerification);
router.post('/resend-verification', [authJwt.verifyToken], controller.resendVerificationEmail);

// Public route for verifying email from link in email
router.get('/verify', controller.verifyEmail);

// Public route for sending verification email (for users who know their email)
router.post('/send-verification', controller.sendVerificationEmail);

module.exports = router;
