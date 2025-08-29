const express = require('express');
const router = express.Router();
const { authJwt } = require('../middleware');
const groupController = require('../controllers/group.controller');

// Apply authentication middleware to specific routes instead of all routes
// This allows group creation without authentication for debugging purposes

// ===== GROUP MANAGEMENT =====

// Create a new group
router.post('/', groupController.createGroup);

// Get all groups
router.get('/', groupController.getAllGroups);

// Get a specific group
router.get('/:id', groupController.getGroupById);

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

// ===== LEGACY ROUTES (MAINTAINED FOR BACKWARD COMPATIBILITY) =====

// Propose a new product
router.post('/:id/propose-product', async (req, res) => {
    try {
        const groupId = req.params.id;
        const product = req.body;
        
        // Find the group
        const group = await require('../models/group.model').findById(groupId);
        
        if (!group) {
            return res.status(404).json({ 
                success: false, 
                message: 'Group not found' 
            });
        }
        
        // Check if user is a member
        const isMember = group.members.includes(req.userId);
        
        if (!isMember) {
            return res.status(403).json({ 
                success: false, 
                message: 'You must be a member to propose products' 
            });
        }
        
        // Add product to proposed products
        if (!group.proposedProducts) {
            group.proposedProducts = [];
        }
        
        group.proposedProducts.push({
            ...product,
            proposedBy: req.userId,
            votes: 0,
            dateProposed: new Date()
        });
        
        await group.save();
        
        res.status(200).json({ 
            success: true, 
            message: 'Product proposed successfully',
            product
        });
    } catch (error) {
        console.error('Error proposing product:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to propose product'
        });
    }
});

// Vote on a proposed product
router.post('/:groupId/vote/:productId', async (req, res) => {
    try {
        const { groupId, productId } = req.params;
        
        // Find the group
        const group = await require('../models/group.model').findById(groupId);
        
        if (!group) {
            return res.status(404).json({ 
                success: false, 
                message: 'Group not found' 
            });
        }
        
        // Check if user is a member
        const isMember = group.members.includes(req.userId);
        
        if (!isMember) {
            return res.status(403).json({ 
                success: false, 
                message: 'You must be a member to vote on products' 
            });
        }
        
        // Find the product
        if (!group.proposedProducts) {
            return res.status(404).json({ 
                success: false, 
                message: 'No proposed products found' 
            });
        }
        
        const productIndex = group.proposedProducts.findIndex(
            product => product._id.toString() === productId
        );
        
        if (productIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }
        
        // Increment vote count
        group.proposedProducts[productIndex].votes += 1;
        await group.save();
        
        res.status(200).json({ 
            success: true, 
            message: 'Vote recorded successfully',
            votes: group.proposedProducts[productIndex].votes
        });
    } catch (error) {
        console.error('Error voting on product:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to record vote'
        });
    }
});

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
