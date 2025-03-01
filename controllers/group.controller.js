const Group = require('../models/group.model');
const User = require('../models/user.model');

/**
 * Create a new group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createGroup = async (req, res) => {
  try {
    // Create new group with the creator as the first member with admin role
    const groupData = {
      ...req.body,
      creator: req.userId,
      members: [{
        user: req.userId,
        role: 'admin',
        joinedAt: Date.now()
      }]
    };
    
    // Debug output
    console.log('Creating group with data:', {
      body: req.body,
      userId: req.userId,
      groupData: groupData
    });
    
    const group = new Group(groupData);
    
    await group.save();
    res.status(201).json({ success: true, group });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Get all groups
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllGroups = async (req, res) => {
  try {
    console.log('Getting all groups');
    
    const groups = await Group.find()
      .populate('creator', 'username email')
      .populate('members.user', 'username email');
    
    console.log(`Found ${groups.length} groups`);
    
    // Debug output for each group
    groups.forEach((group, index) => {
      console.log(`Group ${index + 1}:`, {
        id: group._id,
        name: group.name,
        creator: group.creator,
        members: group.members ? group.members.length : 0
      });
    });
    
    res.status(200).json({ success: true, groups });
  } catch (error) {
    console.error('Error getting all groups:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Get a single group by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'username email')
      .populate('members.user', 'username email')
      .populate('events.attendees', 'username email');
    
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }
    
    res.status(200).json({ success: true, group });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Get all groups a user is a member of
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.userId
    })
    .populate('creator', 'username email')
    .select('name description category location createdAt');
    
    // Format the response to include joined date
    const formattedGroups = groups.map(group => {
      const memberInfo = group.members.find(
        member => member.user.toString() === req.userId
      );
      
      return {
        id: group._id,
        name: group.name,
        description: group.description,
        category: group.category,
        location: group.location,
        joinedDate: memberInfo ? memberInfo.joinedAt : null,
        createdAt: group.createdAt
      };
    });
    
    res.status(200).json({ 
      success: true, 
      groups: formattedGroups 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
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
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }
    
    // Check if user is already a member
    const isMember = group.members.some(
      member => member.user.toString() === req.userId
    );
    
    if (isMember) {
      return res.status(400).json({ 
        success: false, 
        message: 'You are already a member of this group' 
      });
    }
    
    // Add user to group members
    group.members.push({
      user: req.userId,
      role: 'member',
      joinedAt: Date.now()
    });
    
    await group.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Successfully joined the group' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
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
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }
    
    // Check if user is a member
    const memberIndex = group.members.findIndex(
      member => member.user.toString() === req.userId
    );
    
    if (memberIndex === -1) {
      return res.status(400).json({ 
        success: false, 
        message: 'You are not a member of this group' 
      });
    }
    
    // Check if user is the only admin
    const isAdmin = group.members[memberIndex].role === 'admin';
    const adminCount = group.members.filter(
      member => member.role === 'admin'
    ).length;
    
    if (isAdmin && adminCount === 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'You cannot leave the group as you are the only admin. Please assign another admin first.' 
      });
    }
    
    // Remove user from group members
    group.members.splice(memberIndex, 1);
    
    await group.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Successfully left the group' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Update a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }
    
    // Check if user is an admin
    const memberInfo = group.members.find(
      member => member.user.toString() === req.userId
    );
    
    if (!memberInfo || memberInfo.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to update this group' 
      });
    }
    
    // Update group fields
    const updatedGroup = await Group.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    
    res.status(200).json({ 
      success: true, 
      group: updatedGroup 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Delete a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }
    
    // Check if user is an admin
    const memberInfo = group.members.find(
      member => member.user.toString() === req.userId
    );
    
    if (!memberInfo || memberInfo.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to delete this group' 
      });
    }
    
    await Group.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ 
      success: true, 
      message: 'Group successfully deleted' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
