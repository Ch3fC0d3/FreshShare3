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
    
    // Validate input data
    const validation = validateGroupData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validation.errors
      });
    }
    
    // Find the user first
    const user = await User.findById(req.userId);
    if (!user) {
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
