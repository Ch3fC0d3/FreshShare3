const express = require('express');
const router = express.Router();
const { authJwt } = require('../middleware');
const groupController = require('../controllers/group.controller');

// ===== PUBLIC GROUP DISCOVERY =====

// Get all groups (public)
router.get('/', groupController.getAllGroups);

// Get a specific group (public)
router.get('/:id', groupController.getGroupById);

// Require authentication for all routes below this point
router.use(authJwt.verifyToken);

// ===== GROUP MANAGEMENT =====

// Create a new group
router.post('/', groupController.createGroup);

// Update a group
router.put('/:id', groupController.updateGroup);

// Delete a group
router.delete('/:id', groupController.deleteGroup);

// ===== MEMBERSHIP MANAGEMENT =====

// Join a group
router.post('/:id/join', groupController.joinGroup);

// Leave a group
router.post('/:id/leave', groupController.leaveGroup);

// Get group members
router.get('/:id/members', groupController.getGroupMembers);

// Invite a user to the group
router.post('/:id/invite', groupController.inviteToGroup);

// ===== SHOPPING LIST MANAGEMENT =====

// Get shopping list
router.get('/:id/shopping-list', groupController.getShoppingList);

// Add item to shopping list
router.post('/:id/shopping-list', groupController.addShoppingListItem);

// Update shopping list item
router.put('/:id/shopping-list/:itemId', groupController.updateShoppingListItem);

// Delete shopping list item
router.delete('/:id/shopping-list/:itemId', groupController.deleteShoppingListItem);

// ===== DISCUSSION BOARD =====

// Get messages
router.get('/:id/messages', groupController.getMessages);

// Add message
router.post('/:id/messages', groupController.addMessage);

// Delete message
router.delete('/:id/messages/:messageId', groupController.deleteMessage);

// ===== EVENT MANAGEMENT =====

// Get events
router.get('/:id/events', groupController.getEvents);

// Create event
router.post('/:id/events', groupController.createEvent);

// Update event
router.put('/:id/events/:eventId', groupController.updateEvent);

// Delete event
router.delete('/:id/events/:eventId', groupController.deleteEvent);

// ===== RANKED PRODUCTS =====

// Get ranked products list
router.get('/:id/products', groupController.listGroupProducts);

// Suggest a product
router.post('/:id/products', groupController.suggestProduct);

// Vote on a product
router.post('/:id/products/:productId/vote', groupController.voteOnProduct);

// Update product status (e.g., pin/unpin)
router.patch('/:id/products/:productId', groupController.updateProductStatus);

// Remove product
router.delete('/:id/products/:productId', groupController.removeProduct);

// ===== LEGACY ROUTES (MAINTAINED FOR BACKWARD COMPATIBILITY) =====

// Legacy discussion board route (for backward compatibility)
router.post('/:id/discussion', async (req, res) => {
    try {
        // Forward to the new message endpoint
        return groupController.addMessage(req, res);
    } catch (error) {
        console.error('Error posting message:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to post message'
        });
    }
});

module.exports = router;
