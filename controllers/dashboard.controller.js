const db = require('../models');
const Order = db.order;
const Group = db.group;
const Message = db.message;
const User = db.user;

/**
 * Get dashboard data for the authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDashboardData = async (req, res) => {
  try {
    // Validate if user exists in request
    if (!req.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized. Please login.' 
      });
    }

    console.log(`Fetching dashboard data for user ID: ${req.userId}`);

    // Get user details
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Compile dashboard data
    const dashboardData = {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified
      },
      recentOrders: [],
      upcomingDeliveries: [],
      events: [],
      messages: []
    };

    console.log(`Found user: ${user.username} (${user._id})`);

    // Get recent orders
    // Find orders where the user is a participant
    const recentOrders = await Order.find({
      'participants.user': req.userId
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('group', 'name')
    .lean();

    if (recentOrders.length > 0) {
      console.log(`Found ${recentOrders.length} recent orders`);
      dashboardData.recentOrders = recentOrders.map(order => ({
        id: order._id,
        orderNumber: order._id.toString().substring(18, 24).toUpperCase(),
        date: order.createdAt,
        status: order.status,
        items: order.products.length,
        total: order.totalOrderCost,
        groupName: order.group?.name || 'Unknown Group'
      }));
    }

    // Get upcoming deliveries
    // Find orders with future delivery dates
    const now = new Date();
    const upcomingDeliveries = await Order.find({
      'participants.user': req.userId,
      deliveryDate: { $gte: now },
      status: { $nin: ['cancelled', 'delivered'] }
    })
    .sort({ deliveryDate: 1 })
    .limit(3)
    .populate('group', 'name')
    .lean();

    if (upcomingDeliveries.length > 0) {
      console.log(`Found ${upcomingDeliveries.length} upcoming deliveries`);
      dashboardData.upcomingDeliveries = upcomingDeliveries.map(delivery => ({
        id: delivery._id,
        orderNumber: delivery._id.toString().substring(18, 24).toUpperCase(),
        date: delivery.deliveryDate,
        status: delivery.status,
        groupName: delivery.group?.name || 'Unknown Group',
        total: delivery.totalOrderCost
      }));
    }

    // Get upcoming events
    // Find events from groups where the user is a member
    const userGroups = await Group.find({
      members: req.userId
    }).select('name events');

    let allEvents = [];
    userGroups.forEach(group => {
      if (group.events && group.events.length > 0) {
        const groupEvents = group.events.map(event => ({
          ...event.toObject(),
          groupId: group._id,
          groupName: group.name
        }));
        allEvents = [...allEvents, ...groupEvents];
      }
    });

    // Filter for upcoming events and sort by date
    const upcomingEvents = allEvents
      .filter(event => new Date(event.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);

    if (upcomingEvents.length > 0) {
      console.log(`Found ${upcomingEvents.length} upcoming events`);
      dashboardData.events = upcomingEvents;
    }

    // Get recent messages
    const recentMessages = await Message.find({
      recipient: req.userId
    })
    .sort({ timestamp: -1 })
    .limit(5)
    .populate('sender', 'username profileImage')
    .lean();

    if (recentMessages.length > 0) {
      console.log(`Found ${recentMessages.length} recent messages`);
      dashboardData.messages = recentMessages.map(message => ({
        id: message._id,
        content: message.content,
        timestamp: message.timestamp,
        read: message.read,
        sender: {
          id: message.sender._id,
          username: message.sender.username,
          profileImage: message.sender.profileImage || '/assets/images/avatar-placeholder.jpg'
        }
      }));
    }

    console.log('Dashboard data compiled successfully');
    
    // Return dashboard data
    res.status(200).json({ 
      success: true, 
      data: dashboardData
    });
    
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
};

/**
 * Get calendar events for the authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCalendarEvents = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized. Please login.' 
      });
    }

    const { month, year } = req.query;
    
    // Default to current month if not specified
    const targetMonth = month ? parseInt(month) : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    // Create date range for the month
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0); // Last day of month
    
    console.log(`Fetching calendar events for ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

    // Find all groups the user is a member of
    const userGroups = await Group.find({
      members: req.userId
    }).select('name events');
    
    // Get events from user's groups
    let events = [];
    userGroups.forEach(group => {
      if (group.events && group.events.length > 0) {
        const groupEvents = group.events
          .filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= startDate && eventDate <= endDate;
          })
          .map(event => ({
            title: event.title,
            description: event.description,
            date: event.date,
            location: event.location,
            groupId: group._id,
            groupName: group.name,
            id: event._id
          }));
        
        events = [...events, ...groupEvents];
      }
    });
    
    // Get order deliveries for the month
    const orders = await Order.find({
      'participants.user': req.userId,
      deliveryDate: { $gte: startDate, $lte: endDate }
    })
    .populate('group', 'name')
    .lean();
    
    // Add order deliveries as events
    const deliveryEvents = orders.map(order => ({
      title: `Order Delivery - ${order.group?.name || 'Group Order'}`,
      description: `Delivery for order #${order._id.toString().substring(18, 24).toUpperCase()}`,
      date: order.deliveryDate,
      type: 'delivery',
      orderId: order._id,
      groupId: order.group?._id
    }));
    
    events = [...events, ...deliveryEvents];
    
    // Sort all events by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    console.log(`Found ${events.length} calendar events for the period`);
    
    res.status(200).json({
      success: true,
      data: {
        month: targetMonth,
        year: targetYear,
        events
      }
    });
    
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar events',
      error: error.message
    });
  }
};
