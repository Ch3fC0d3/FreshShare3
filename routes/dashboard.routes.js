const express = require('express');
const router = express.Router();
const { authJwt } = require('../middleware');
const dashboardController = require('../controllers/dashboard.controller');

// Apply authentication middleware to all routes
router.use(authJwt.verifyToken);

// Get dashboard data
router.get('/', dashboardController.getDashboardData);

// Get calendar events
router.get('/calendar', dashboardController.getCalendarEvents);

module.exports = router;
