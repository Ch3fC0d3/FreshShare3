const Order = require('../models/order.model');
const Group = require('../models/group.model');

/**
 * Create a new order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createOrder = async (req, res) => {
  try {
    const { groupId, products, deliveryDate, deliveryLocation, notes } = req.body;
    
    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }
    
    // Check if user is a member of the group
    const isMember = group.members.some(
      member => member.user.toString() === req.userId
    );
    
    if (!isMember) {
      return res.status(403).json({ 
        success: false, 
        message: 'You must be a member of the group to create an order' 
      });
    }
    
    // Create new order
    const order = new Order({
      group: groupId,
      products,
      deliveryDate,
      deliveryLocation,
      notes,
      participants: [{
        user: req.userId,
        items: [],
        totalCost: 0,
        hasPaid: false
      }]
    });
    
    await order.save();
    
    // Update group stats
    group.stats.totalProductsOrdered += products.length;
    group.stats.pastOrders.push(order._id);
    await group.save();
    
    res.status(201).json({ 
      success: true, 
      order 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Get all orders for a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getGroupOrders = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }
    
    // Check if user is a member of the group
    const isMember = group.members.some(
      member => member.user.toString() === req.userId
    );
    
    if (!isMember) {
      return res.status(403).json({ 
        success: false, 
        message: 'You must be a member of the group to view orders' 
      });
    }
    
    // Get all orders for the group
    const orders = await Order.find({ group: groupId })
      .populate('participants.user', 'username email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({ 
      success: true, 
      orders 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Get a single order by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Get order with populated fields
    const order = await Order.findById(orderId)
      .populate('group', 'name description')
      .populate('participants.user', 'username email');
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    // Check if user is a participant in the order
    const isParticipant = order.participants.some(
      participant => participant.user._id.toString() === req.userId
    );
    
    // Check if user is a member of the group
    const group = await Group.findById(order.group);
    const isGroupMember = group.members.some(
      member => member.user.toString() === req.userId
    );
    
    if (!isParticipant && !isGroupMember) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to view this order' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      order 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Update an order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const updates = req.body;
    
    // Get the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    // Check if user is a participant in the order
    const isParticipant = order.participants.some(
      participant => participant.user.toString() === req.userId
    );
    
    // Check if user is an admin of the group
    const group = await Group.findById(order.group);
    const isAdmin = group.members.some(
      member => member.user.toString() === req.userId && member.role === 'admin'
    );
    
    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to update this order' 
      });
    }
    
    // Update the order
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: updates },
      { new: true }
    );
    
    res.status(200).json({ 
      success: true, 
      order: updatedOrder 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Join an order as a participant
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.joinOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items } = req.body;
    
    // Get the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    // Check if user is already a participant
    const isParticipant = order.participants.some(
      participant => participant.user.toString() === req.userId
    );
    
    if (isParticipant) {
      return res.status(400).json({ 
        success: false, 
        message: 'You are already a participant in this order' 
      });
    }
    
    // Check if user is a member of the group
    const group = await Group.findById(order.group);
    const isGroupMember = group.members.some(
      member => member.user.toString() === req.userId
    );
    
    if (!isGroupMember) {
      return res.status(403).json({ 
        success: false, 
        message: 'You must be a member of the group to join this order' 
      });
    }
    
    // Calculate total cost for the user
    let totalCost = 0;
    
    if (items && items.length > 0) {
      items.forEach(item => {
        const product = order.products.find(p => p._id.toString() === item.productId);
        if (product) {
          const itemCost = (product.casePrice / product.totalUnits) * item.quantity;
          item.cost = itemCost;
          totalCost += itemCost;
        }
      });
    }
    
    // Add user as a participant
    order.participants.push({
      user: req.userId,
      items: items || [],
      totalCost,
      hasPaid: false
    });
    
    await order.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Successfully joined the order',
      totalCost
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Update payment status for a participant
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { hasPaid } = req.body;
    
    // Get the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    // Find the participant
    const participantIndex = order.participants.findIndex(
      participant => participant.user.toString() === req.userId
    );
    
    if (participantIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'You are not a participant in this order' 
      });
    }
    
    // Update payment status
    order.participants[participantIndex].hasPaid = hasPaid;
    
    await order.save();
    
    res.status(200).json({ 
      success: true, 
      message: `Payment status updated to ${hasPaid ? 'paid' : 'unpaid'}`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Cancel an order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Get the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    // Check if user is an admin of the group
    const group = await Group.findById(order.group);
    const isAdmin = group.members.some(
      member => member.user.toString() === req.userId && member.role === 'admin'
    );
    
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only group admins can cancel orders' 
      });
    }
    
    // Update order status
    order.status = 'cancelled';
    await order.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Order cancelled successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
