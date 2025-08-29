// Setup FreshShare database with sample data in local MongoDB
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Local MongoDB connection string (using 127.0.0.1 which works)
const uri = "mongodb://127.0.0.1:27017/freshshare_db";
const client = new MongoClient(uri);

// Sample data for the database
const sampleData = {
  users: [
    {
      username: 'testuser',
      email: 'test@example.com',
      password: '$2a$10$XHvjKGhiDdeFV5RFU9.GUuEl0INiCYJRYz8R4ai1JNLUcFKBxQKAy', // hashed 'password123'
      firstName: 'Test',
      lastName: 'User',
      profileImage: '/images/profile-placeholder.jpg',
      location: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      },
      phoneNumber: '(555) 123-4567',
      roles: ['user'],
      createdAt: new Date()
    },
    {
      username: 'admin',
      email: 'admin@freshshare.com',
      password: '$2a$10$XHvjKGhiDdeFV5RFU9.GUuEl0INiCYJRYz8R4ai1JNLUcFKBxQKAy', // hashed 'password123'
      firstName: 'Admin',
      lastName: 'User',
      profileImage: '/images/profile-placeholder.jpg',
      location: {
        street: '456 Admin St',
        city: 'Adminville',
        state: 'CA',
        zipCode: '54321'
      },
      phoneNumber: '(555) 987-6543',
      roles: ['admin', 'user'],
      createdAt: new Date()
    }
  ],
  products: [
    {
      name: 'Organic Apples',
      description: 'Fresh organic apples from local farms',
      price: 2.99,
      quantity: 50,
      category: 'Fruits',
      image: '/uploads/marketplace/apples.jpg',
      seller: 'testuser',
      location: 'Anytown, CA',
      createdAt: new Date()
    },
    {
      name: 'Farm Fresh Eggs',
      description: 'Organic free-range eggs',
      price: 4.99,
      quantity: 24,
      category: 'Dairy & Eggs',
      image: '/uploads/marketplace/eggs.jpg',
      seller: 'testuser',
      location: 'Anytown, CA',
      createdAt: new Date()
    },
    {
      name: 'Homemade Bread',
      description: 'Freshly baked sourdough bread',
      price: 5.99,
      quantity: 10,
      category: 'Bakery',
      image: '/uploads/marketplace/bread.jpg',
      seller: 'admin',
      location: 'Adminville, CA',
      createdAt: new Date()
    }
  ],
  groups: [
    {
      name: 'Anytown Food Sharing',
      description: 'A group for sharing food in Anytown',
      location: 'Anytown, CA',
      members: ['testuser', 'admin'],
      admin: 'testuser',
      image: '/uploads/groups/anytown.jpg',
      createdAt: new Date()
    },
    {
      name: 'Organic Gardeners',
      description: 'Share tips and produce from organic gardens',
      location: 'Adminville, CA',
      members: ['admin'],
      admin: 'admin',
      image: '/uploads/groups/gardeners.jpg',
      createdAt: new Date()
    }
  ]
};

async function setupFreshShareDB() {
  try {
    console.log('Connecting to local MongoDB...');
    await client.connect();
    console.log('Connected successfully to local MongoDB');
    
    const db = client.db('freshshare_db');
    
    // Create collections and insert sample data
    for (const [collectionName, documents] of Object.entries(sampleData)) {
      if (documents.length > 0) {
        const collection = db.collection(collectionName);
        
        // Check if collection already has data
        const count = await collection.countDocuments();
        if (count === 0) {
          // Insert sample data
          const result = await collection.insertMany(documents);
          console.log(`Added ${result.insertedCount} documents to ${collectionName} collection`);
        } else {
          console.log(`Collection ${collectionName} already has ${count} documents, skipping...`);
        }
      }
    }
    
    // Update .env.local to use local MongoDB
    const envPath = path.join(__dirname, '.env.local');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace MongoDB connection string
    envContent = envContent.replace(
      /MONGODB_HOST=.*/,
      'MONGODB_HOST=mongodb://127.0.0.1:27017/freshshare_db'
    );
    
    fs.writeFileSync(envPath, envContent);
    console.log('Updated .env.local to use local MongoDB');
    
    console.log('\nFreshShare database setup complete!');
    console.log('You can now use the local database for development.');
    console.log('\nSample users:');
    console.log('1. Username: testuser, Password: password123');
    console.log('2. Username: admin, Password: password123');
    
  } catch (error) {
    console.error('Error setting up FreshShare database:', error);
  } finally {
    await client.close();
  }
}

setupFreshShareDB().catch(console.dir);
