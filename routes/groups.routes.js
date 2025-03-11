const express = require('express');
const router = express.Router();
const { authJwt } = require('../middleware');
const groupController = require('../controllers/group.controller');

// Apply authentication middleware to all routes
router.use(authJwt.verifyToken);

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

// Join a group
router.post('/:id/join', groupController.joinGroup);

// Leave a group
router.post('/:id/leave', groupController.leaveGroup);

// Add a product to shopping list
router.post('/:id/shopping-list', async (req, res) => {
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
        const isMember = group.members.some(
            member => member.user.toString() === req.userId
        );
        
        if (!isMember) {
            return res.status(403).json({ 
                success: false, 
                message: 'You must be a member to add products to the shopping list' 
            });
        }
        
        // Add product to shopping list
        group.shoppingList.push(product);
        await group.save();
        
        res.status(201).json({ 
            success: true, 
            message: 'Product added to shopping list',
            product: product
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Get shopping list
router.get('/:id/shopping-list', async (req, res) => {
    try {
        const groupId = req.params.id;
        
        // Find the group
        const group = await require('../models/group.model').findById(groupId);
        
        if (!group) {
            return res.status(404).json({ 
                success: false, 
                message: 'Group not found' 
            });
        }
        
        res.status(200).json({ 
            success: true, 
            shoppingList: group.shoppingList 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

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
        const isMember = group.members.some(
            member => member.user.toString() === req.userId
        );
        
        if (!isMember) {
            return res.status(403).json({ 
                success: false, 
                message: 'You must be a member to propose products' 
            });
        }
        
        // Add product to proposed products
        group.proposedProducts.push(product);
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
        const isMember = group.members.some(
            member => member.user.toString() === req.userId
        );
        
        if (!isMember) {
            return res.status(403).json({ 
                success: false, 
                message: 'You must be a member to vote on products' 
            });
        }
        
        // Find the product
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

// Add a message to the discussion board
router.post('/:id/discussion', async (req, res) => {
    try {
        const groupId = req.params.id;
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Message content is required' 
            });
        }
        
        // Find the group
        const group = await require('../models/group.model').findById(groupId);
        
        if (!group) {
            return res.status(404).json({ 
                success: false, 
                message: 'Group not found' 
            });
        }
        
        // Check if user is a member
        const isMember = group.members.some(
            member => member.user.toString() === req.userId
        );
        
        if (!isMember) {
            return res.status(403).json({ 
                success: false, 
                message: 'You must be a member to post messages' 
            });
        }
        
        // Add message to discussion board
        group.discussionBoard.push({
            user: req.userId,
            message,
            timestamp: Date.now()
        });
        
        await group.save();
        
        res.status(200).json({ 
            success: true, 
            message: 'Message posted successfully' 
        });
    } catch (error) {
        console.error('Error posting message:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to post message'
        });
    }
});

module.exports = router;
