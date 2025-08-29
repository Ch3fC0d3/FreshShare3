const Group = require('../models/group.model');
const User = require('../models/user.model');

/**
 * Helper function to validate group creation data
 * @param {Object} data - Group creation data
 * @returns {Object} - { isValid, errors }
 */
const validateGroupData = (data) => {
  const errors = [];
  
  // Check required fields
  const requiredFields = ['name', 'description', 'category'];
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    errors.push(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  // Check location fields
  if (!data.location || !data.location.city || !data.location.zipCode) {
    errors.push('City and zip code are required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Helper function to populate group data
 * @param {Object} group - Group document
 * @param {string} userId - Optional user ID for membership info
 * @returns {Promise<Object>} - Populated group data
 */
const populateGroupData = async (group, userId = null) => {
  const populatedGroup = await Group.findById(group._id)
    .populate('createdBy', 'username')
    .populate('members', 'username')
    .populate('admins', 'username');
    
  const groupObj = populatedGroup.toObject();
  
  if (userId) {
    const user = await User.findById(userId);
    if (user) {
      groupObj.isMember = user.isMemberOfGroup(group._id);
      groupObj.isAdmin = user.isAdminOfGroup(group._id);
      groupObj.isModerator = user.isModeratorOfGroup(group._id);
      
      const membership = user.groups.find(m => 
        m.group.toString() === group._id.toString()
      );
      if (membership) {
        groupObj.membershipStatus = membership.status;
        groupObj.joinedAt = membership.joinedAt;
        groupObj.role = membership.role;
      }
    }
  }
  
  return groupObj;
};

/**
 * Create a new group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createGroup = async (req, res) => {
  try {
    console.log('Creating new group with data:', JSON.stringify(req.body, null, 2));
    console.log('User ID from request:', req.userId);
    console.log('Authorization header:', req.headers.authorization);
    
    // Validate input data
    const validation = validateGroupData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validation.errors
      });
    }
    
    // Require authentication for group creation
    if (!req.userId) {
      console.log('No user ID found in request. Authentication required for group creation.');
      return res.status(401).json({
        success: false,
        message: 'Authentication required to create a group'
      });
    }
    
    // Find the user by ID
    const user = await User.findById(req.userId);
    if (!user) {
      console.log('User not found with ID:', req.userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create group object with validated data
    const groupData = {
      name: req.body.name.trim(),
      description: req.body.description.trim(),
      category: req.body.category,
      location: {
        street: (req.body.location.street || '').trim(),
        city: req.body.location.city.trim(),
        state: (req.body.location.state || '').trim(),
        zipCode: req.body.location.zipCode.trim()
      },
      rules: (req.body.rules || '').trim(),
      deliveryDays: req.body.deliveryDays || [],
      isPrivate: req.body.isPrivate || false,
      createdBy: req.userId,
      members: [req.userId],
      admins: [req.userId]
    };

    // Create and save the group
    const group = new Group(groupData);
    const savedGroup = await group.save();
    
    // Add user as admin
    await user.joinGroup(savedGroup._id, 'admin');
    
    // Return populated group data
    const populatedGroup = await populateGroupData(savedGroup, req.userId);
    
    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      group: populatedGroup
    });

  } catch (err) {
    console.error('Error in createGroup:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(err.errors).map(error => error.message)
      });
    }
    
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A group with this name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating group',
      error: err.message
    });
  }
};

/**
 * Get all groups with optional filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllGroups = async (req, res) => {
  try {
    console.log('Fetching groups with filters:', req.query);
    
    // Build query based on filters
    const query = {};
    
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    if (req.query.city) {
      query['location.city'] = new RegExp(req.query.city, 'i');
    }
    
    if (req.query.state) {
      query['location.state'] = new RegExp(req.query.state, 'i');
    }
    
    if (req.query.zipCode) {
      query['location.zipCode'] = req.query.zipCode;
    }
    
    // Get groups with populated user data
    const groups = await Group.find(query)
      .populate('createdBy', 'username')
      .populate('members', 'username')
      .populate('admins', 'username')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${groups.length} groups`);
    
    // Populate group data with membership info if user is authenticated
    const groupsWithMeta = await Promise.all(
      groups.map(group => populateGroupData(group, req.userId))
    );
    
    res.json({
      success: true,
      groups: groupsWithMeta
    });
  } catch (err) {
    console.error('Error in getAllGroups:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching groups',
      error: err.message
    });
  }
};

/**
 * Get group by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getGroupById = async (req, res) => {
  try {
    console.log('Fetching group by ID:', req.params.id);
    
    const group = await Group.findById(req.params.id)
      .populate('createdBy', 'username')
      .populate('members', 'username')
      .populate('admins', 'username');
    
    if (!group) {
      console.log('Group not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    console.log('Group found:', group._id);
    res.json({
      success: true,
      group: group
    });
  } catch (err) {
    console.error('Error in getGroupById:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching group',
      error: err.message
    });
  }
};

/**
 * Update group by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateGroup = async (req, res) => {
  try {
    console.log('Updating group:', req.params.id);
    console.log('Update data:', JSON.stringify(req.body, null, 2));

    const group = await Group.findById(req.params.id);
    
    if (!group) {
      console.log('Group not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is admin
    if (!group.admins.includes(req.userId)) {
      console.log('User not authorized to update group:', req.userId);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this group'
      });
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    console.log('Group updated successfully:', updatedGroup._id);
    res.json({
      success: true,
      message: 'Group updated successfully',
      group: updatedGroup
    });
  } catch (err) {
    console.error('Error in updateGroup:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(err.errors).map(error => error.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating group',
      error: err.message
    });
  }
};

/**
 * Delete group by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteGroup = async (req, res) => {
  try {
    console.log('Deleting group:', req.params.id);
    
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      console.log('Group not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is admin
    if (!group.admins.includes(req.userId)) {
      console.log('User not authorized to delete group:', req.userId);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this group'
      });
    }

    // Remove group from all members' groups arrays
    await User.updateMany(
      { groups: group._id },
      { $pull: { groups: group._id, adminGroups: group._id } }
    );

    await Group.findByIdAndDelete(req.params.id);
    console.log('Group deleted successfully');
    
    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (err) {
    console.error('Error in deleteGroup:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting group',
      error: err.message
    });
  }
};

/**
 * Join a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.joinGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    console.log(`User ${req.userId} attempting to join group ${groupId}`);
    
    // Find the group and user
    const [group, user] = await Promise.all([
      Group.findById(groupId),
      User.findById(req.userId)
    ]);
    
    // Validate group and user exist
    if (!group || !user) {
      return res.status(404).json({
        success: false,
        message: !group ? 'Group not found' : 'User not found'
      });
    }
    
    // Check if already a member
    if (user.isMemberOfGroup(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Already a member of this group'
      });
    }
    
    // Join group and update both user and group
    await Promise.all([
      user.joinGroup(groupId),
      Group.findByIdAndUpdate(groupId, { $addToSet: { members: req.userId } })
    ]);
    
    // Return updated group data
    const updatedGroup = await populateGroupData(group, req.userId);
    
    res.json({
      success: true,
      message: 'Successfully joined the group',
      group: updatedGroup
    });
  } catch (err) {
    console.error('Error in joinGroup:', err);
    res.status(500).json({
      success: false,
      message: 'Error joining group',
      error: err.message
    });
  }
};

/**
 * Leave a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.leaveGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    console.log(`User ${req.userId} attempting to leave group ${groupId}`);
    
    // Find the group and user
    const [group, user] = await Promise.all([
      Group.findById(groupId),
      User.findById(req.userId)
    ]);
    
    // Validate group and user exist
    if (!group || !user) {
      return res.status(404).json({
        success: false,
        message: !group ? 'Group not found' : 'User not found'
      });
    }
    
    // Check if a member
    if (!user.isMemberOfGroup(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Not a member of this group'
      });
    }
    
    // Check if last admin
    if (user.isAdminOfGroup(groupId) && group.admins.length === 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot leave group as the last admin. Transfer admin role first.'
      });
    }
    
    // Leave group and update both user and group
    await Promise.all([
      user.leaveGroup(groupId),
      Group.findByIdAndUpdate(groupId, {
        $pull: {
          members: req.userId,
          admins: req.userId
        }
      })
    ]);
    
    res.json({
      success: true,
      message: 'Successfully left the group'
    });
  } catch (err) {
    console.error('Error in leaveGroup:', err);
    res.status(500).json({
      success: false,
      message: 'Error leaving group',
      error: err.message
    });
  }
};

/**
 * Get group members with details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getGroupMembers = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    console.log(`Getting members for group ${groupId}`);
    
    // Find the group
    const group = await Group.findById(groupId)
      .populate('members', 'username email avatar')
      .populate('admins', 'username email avatar');
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Format members with roles
    const members = group.members.map(member => {
      const isAdmin = group.admins.some(admin => admin._id.toString() === member._id.toString());
      return {
        _id: member._id,
        name: member.username,
        email: member.email,
        avatar: member.avatar || null,
        role: isAdmin ? 'admin' : 'member'
      };
    });
    
    res.json({
      success: true,
      members
    });
  } catch (err) {
    console.error('Error in getGroupMembers:', err);
    res.status(500).json({
      success: false,
      message: 'Error getting group members',
      error: err.message
    });
  }
};

/**
 * Invite a user to join the group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.inviteToGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Find the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if user is admin or creator
    if (!group.admins.includes(req.userId) && group.createdBy.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can invite users'
      });
    }
    
    // Find user by email
    const invitedUser = await User.findOne({ email });
    
    // If user exists, add them to the group
    if (invitedUser) {
      // Check if already a member
      if (invitedUser.isMemberOfGroup(groupId)) {
        return res.status(400).json({
          success: false,
          message: 'User is already a member of this group'
        });
      }
      
      // Add user to group
      await Promise.all([
        invitedUser.joinGroup(groupId),
        Group.findByIdAndUpdate(groupId, { $addToSet: { members: invitedUser._id } })
      ]);
      
      return res.json({
        success: true,
        message: 'User added to the group'
      });
    }
    
    // If user doesn't exist, we would normally send an email invitation
    // For now, just return success message
    res.json({
      success: true,
      message: 'Invitation sent to ' + email
    });
  } catch (err) {
    console.error('Error in inviteToGroup:', err);
    res.status(500).json({
      success: false,
      message: 'Error inviting user to group',
      error: err.message
    });
  }
};

// Models for new functionality (temporary - should be moved to separate files)
const mongoose = require('mongoose');

// Shopping List Item Schema
const ShoppingListItemSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
    trim: true
  },
  vendor: {
    type: String,
    trim: true
  },
  casePrice: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  totalUnits: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  }
}, {
  timestamps: true
});

// Message Schema
const MessageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  }
}, {
  timestamps: true
});

// Event Schema
const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  }
}, {
  timestamps: true
});

// Create models from schemas or reference existing ones
const ShoppingListItem = mongoose.model('ShoppingListItem', ShoppingListItemSchema);
// Use the existing Message model instead of redefining it
const Message = require('../models/message.model');
const Event = mongoose.model('Event', EventSchema);

/**
 * Get shopping list for a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getShoppingList = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    
    const items = await ShoppingListItem.find({ groupId })
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      items
    });
  } catch (err) {
    console.error('Error in getShoppingList:', err);
    res.status(500).json({
      success: false,
      message: 'Error getting shopping list',
      error: err.message
    });
  }
};

/**
 * Add item to shopping list
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.addShoppingListItem = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    
    // Validate required fields
    const { productName, casePrice, quantity, totalUnits } = req.body;
    if (!productName) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }
    
    // Find the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if user is a member
    if (!group.members.includes(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Only group members can add items'
      });
    }
    
    // Create and save the item
    const newItem = new ShoppingListItem({
      productName,
      vendor: req.body.vendor || '',
      casePrice: casePrice || 0,
      quantity: quantity || 1,
      totalUnits: totalUnits || 1,
      notes: req.body.notes || '',
      createdBy: req.userId,
      groupId
    });
    
    const savedItem = await newItem.save();
    await savedItem.populate('createdBy', 'username email');
    
    res.status(201).json({
      success: true,
      item: savedItem
    });
  } catch (err) {
    console.error('Error in addShoppingListItem:', err);
    res.status(500).json({
      success: false,
      message: 'Error adding shopping list item',
      error: err.message
    });
  }
};

/**
 * Update shopping list item
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateShoppingListItem = async (req, res) => {
  try {
    const { id: groupId, itemId } = req.params;
    
    // Find the item
    const item = await ShoppingListItem.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    // Check if item belongs to the specified group
    if (item.groupId.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Item does not belong to this group'
      });
    }
    
    // Check if user is the creator or an admin
    const group = await Group.findById(groupId);
    const isAdmin = group.admins.includes(req.userId);
    const isCreator = item.createdBy.toString() === req.userId;
    
    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this item'
      });
    }
    
    // Update the item
    const updatedItem = await ShoppingListItem.findByIdAndUpdate(
      itemId,
      {
        productName: req.body.productName,
        vendor: req.body.vendor || '',
        casePrice: req.body.casePrice || 0,
        quantity: req.body.quantity || 1,
        totalUnits: req.body.totalUnits || 1,
        notes: req.body.notes || ''
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email');
    
    res.json({
      success: true,
      item: updatedItem
    });
  } catch (err) {
    console.error('Error in updateShoppingListItem:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating shopping list item',
      error: err.message
    });
  }
};

/**
 * Delete shopping list item
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteShoppingListItem = async (req, res) => {
  try {
    const { id: groupId, itemId } = req.params;
    
    // Find the item
    const item = await ShoppingListItem.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    // Check if item belongs to the specified group
    if (item.groupId.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Item does not belong to this group'
      });
    }
    
    // Check if user is the creator or an admin
    const group = await Group.findById(groupId);
    const isAdmin = group.admins.includes(req.userId);
    const isCreator = item.createdBy.toString() === req.userId;
    
    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this item'
      });
    }
    
    // Delete the item
    await ShoppingListItem.findByIdAndDelete(itemId);
    
    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (err) {
    console.error('Error in deleteShoppingListItem:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting shopping list item',
      error: err.message
    });
  }
};

/**
 * Get messages for a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getMessages = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    
    const messages = await Message.find({ groupId })
      .populate('author', 'username email avatar')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      messages
    });
  } catch (err) {
    console.error('Error in getMessages:', err);
    res.status(500).json({
      success: false,
      message: 'Error getting messages',
      error: err.message
    });
  }
};

/**
 * Add message to discussion board
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.addMessage = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }
    
    // Find the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if user is a member
    if (!group.members.includes(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Only group members can post messages'
      });
    }
    
    // Create and save the message
    const newMessage = new Message({
      content,
      author: req.userId,
      groupId
    });
    
    const savedMessage = await newMessage.save();
    await savedMessage.populate('author', 'username email avatar');
    
    res.status(201).json({
      success: true,
      message: savedMessage
    });
  } catch (err) {
    console.error('Error in addMessage:', err);
    res.status(500).json({
      success: false,
      message: 'Error adding message',
      error: err.message
    });
  }
};

/**
 * Delete message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { id: groupId, messageId } = req.params;
    
    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Check if message belongs to the specified group
    if (message.groupId.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Message does not belong to this group'
      });
    }
    
    // Check if user is the author or an admin
    const group = await Group.findById(groupId);
    const isAdmin = group.admins.includes(req.userId);
    const isAuthor = message.author.toString() === req.userId;
    
    if (!isAdmin && !isAuthor) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }
    
    // Delete the message
    await Message.findByIdAndDelete(messageId);
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (err) {
    console.error('Error in deleteMessage:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: err.message
    });
  }
};

/**
 * Get events for a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getEvents = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    
    const events = await Event.find({ groupId })
      .populate('createdBy', 'username email')
      .sort({ date: 1 });
    
    res.json({
      success: true,
      events
    });
  } catch (err) {
    console.error('Error in getEvents:', err);
    res.status(500).json({
      success: false,
      message: 'Error getting events',
      error: err.message
    });
  }
};

/**
 * Create an event
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createEvent = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { title, date, location, description } = req.body;
    
    if (!title || !date) {
      return res.status(400).json({
        success: false,
        message: 'Title and date are required'
      });
    }
    
    // Find the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if user is a member
    if (!group.members.includes(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Only group members can create events'
      });
    }
    
    // Create and save the event
    const newEvent = new Event({
      title,
      date,
      location: location || '',
      description: description || '',
      createdBy: req.userId,
      groupId
    });
    
    const savedEvent = await newEvent.save();
    await savedEvent.populate('createdBy', 'username email');
    
    res.status(201).json({
      success: true,
      event: savedEvent
    });
  } catch (err) {
    console.error('Error in createEvent:', err);
    res.status(500).json({
      success: false,
      message: 'Error creating event',
      error: err.message
    });
  }
};

/**
 * Update an event
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateEvent = async (req, res) => {
  try {
    const { id: groupId, eventId } = req.params;
    
    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Check if event belongs to the specified group
    if (event.groupId.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Event does not belong to this group'
      });
    }
    
    // Check if user is the creator or an admin
    const group = await Group.findById(groupId);
    const isAdmin = group.admins.includes(req.userId);
    const isCreator = event.createdBy.toString() === req.userId;
    
    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event'
      });
    }
    
    // Update the event
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      {
        title: req.body.title,
        date: req.body.date,
        location: req.body.location || '',
        description: req.body.description || ''
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email');
    
    res.json({
      success: true,
      event: updatedEvent
    });
  } catch (err) {
    console.error('Error in updateEvent:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating event',
      error: err.message
    });
  }
};

/**
 * Delete an event
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteEvent = async (req, res) => {
  try {
    const { id: groupId, eventId } = req.params;
    
    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Check if event belongs to the specified group
    if (event.groupId.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Event does not belong to this group'
      });
    }
    
    // Check if user is the creator or an admin
    const group = await Group.findById(groupId);
    const isAdmin = group.admins.includes(req.userId);
    const isCreator = event.createdBy.toString() === req.userId;
    
    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event'
      });
    }
    
    // Delete the event
    await Event.findByIdAndDelete(eventId);
    
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (err) {
    console.error('Error in deleteEvent:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting event',
      error: err.message
    });
  }
};
