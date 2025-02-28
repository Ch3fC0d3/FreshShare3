/**
 * Seed script to populate the database with sample data
 * Run with: node seed.js
 */
const mongoose = require('mongoose');
const db = require('./models');
const dbConfig = require('./config/db.config');
require('dotenv').config();

// Sample user data
const users = [
  {
    username: 'jane_gardener',
    email: 'jane@example.com',
    password: 'password123',
    profileImage: '/assets/images/avatar1.jpg'
  },
  {
    username: 'urban_farmer',
    email: 'farmer@example.com',
    password: 'password123',
    profileImage: '/assets/images/avatar2.jpg'
  },
  {
    username: 'green_thumb',
    email: 'green@example.com',
    password: 'password123',
    profileImage: '/assets/images/avatar3.jpg'
  }
];

// Sample listing data
const listings = [
  {
    title: 'Organic Tomatoes',
    description: 'Fresh, homegrown organic tomatoes from my backyard garden. These are pesticide-free and picked at peak ripeness for maximum flavor.',
    price: 4.99,
    priceUnit: 'lb',
    category: 'vegetables',
    condition: 'not-applicable',
    images: ['/assets/images/vegetables.jpg'],
    location: {
      address: '123 Garden St',
      city: 'Greenville',
      state: 'TX',
      zipCode: '75401',
      coordinates: {
        lat: 33.1384,
        lng: -96.1108
      }
    },
    isOrganic: true,
    quantity: 10,
    tags: ['organic', 'tomatoes', 'homegrown', 'vegetables']
  },
  {
    title: 'Garden Spade',
    description: 'Lightly used garden spade, perfect for small garden projects. Comfortable grip and durable construction.',
    price: 12.50,
    priceUnit: 'each',
    category: 'tools',
    condition: 'good',
    images: ['/assets/images/tools.jpg'],
    location: {
      address: '456 Farm Rd',
      city: 'Greenville',
      state: 'TX',
      zipCode: '75402',
      coordinates: {
        lat: 33.1295,
        lng: -96.1177
      }
    },
    isOrganic: false,
    quantity: 1,
    tags: ['tools', 'gardening', 'spade']
  },
  {
    title: 'Fresh Strawberries',
    description: 'Sweet, juicy strawberries grown in my home garden. Perfect for desserts, smoothies, or eating fresh!',
    price: 6.99,
    priceUnit: 'lb',
    category: 'fruits',
    condition: 'not-applicable',
    images: ['/assets/images/fruits.jpg'],
    location: {
      address: '789 Berry Lane',
      city: 'Greenville',
      state: 'TX',
      zipCode: '75403',
      coordinates: {
        lat: 33.1456,
        lng: -96.1234
      }
    },
    isOrganic: true,
    quantity: 5,
    tags: ['organic', 'strawberries', 'fruits', 'fresh']
  }
];

// Connect to MongoDB
mongoose
  .connect(`mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(async () => {
    console.log("Successfully connected to MongoDB.");
    
    try {
      // Clear existing data
      await db.user.deleteMany({});
      await db.listing.deleteMany({});
      
      console.log('Cleared existing data');
      
      // Create users
      const createdUsers = await db.user.insertMany(users);
      console.log(`Created ${createdUsers.length} users`);
      
      // Assign users to listings
      const populatedListings = listings.map((listing, index) => {
        return {
          ...listing,
          seller: createdUsers[index % createdUsers.length]._id
        };
      });
      
      // Create listings
      const createdListings = await db.listing.insertMany(populatedListings);
      console.log(`Created ${createdListings.length} listings`);
      
      console.log('Database seeded successfully!');
    } catch (error) {
      console.error('Error seeding database:', error);
    } finally {
      mongoose.connection.close();
    }
  })
  .catch(err => {
    console.error("Connection error", err);
    process.exit(1);
  });
