const mongoose = require('mongoose');
const db = require('./models');
const dbConfig = require('./config/db.config');

// Connect to MongoDB
mongoose
  .connect(`mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Successfully connected to MongoDB.");
    seedDatabase();
  })
  .catch(err => {
    console.error("Connection error", err);
    process.exit(1);
  });

async function seedDatabase() {
  try {
    // Clear existing data
    await db.group.deleteMany({});
    console.log("Cleared existing groups");

    // Insert groups
    const groups = [
      {
        "name": "Austin Organic Buyers",
        "description": "A group focused on buying organic food in bulk directly from farmers.",
        "creator": new mongoose.Types.ObjectId("65a1b2c3d4e5f67890123456"),
        "category": "food_bank",
        "location": {
          "street": "123 Main St",
          "city": "Austin",
          "state": "TX",
          "zipCode": "78701"
        },
        "members": [
          {
            "user": new mongoose.Types.ObjectId("65a1b2c3d4e5f67890123456"),
            "role": "admin",
            "joinedAt": new Date()
          },
          {
            "user": new mongoose.Types.ObjectId("65a1b2c3d4e5f67890123457"),
            "role": "member",
            "joinedAt": new Date()
          }
        ],
        "deliveryDays": ["monday", "thursday"],
        "isPrivate": false,
        "rules": "1. Be respectful to all members\n2. Share resources and knowledge freely\n3. Maintain regular participation\n4. No commercial advertising without approval\n5. Respect privacy and consent when sharing photos"
      },
      {
        "name": "Dallas Bulk Buyers",
        "description": "Helping the Dallas community save money on wholesale food.",
        "creator": new mongoose.Types.ObjectId("65a1b2c3d4e5f67890123458"),
        "category": "food_bank",
        "location": {
          "street": "456 Elm St",
          "city": "Dallas",
          "state": "TX",
          "zipCode": "75201"
        },
        "members": [
          {
            "user": new mongoose.Types.ObjectId("65a1b2c3d4e5f67890123458"),
            "role": "admin",
            "joinedAt": new Date()
          }
        ],
        "deliveryDays": ["friday"],
        "isPrivate": false,
        "rules": "1. Be respectful\n2. Share resources\n3. Participate regularly"
      },
      {
        "name": "Houston Community Garden",
        "description": "A community garden group focused on growing and sharing fresh produce.",
        "creator": new mongoose.Types.ObjectId("65a1b2c3d4e5f67890123459"),
        "category": "community_garden",
        "location": {
          "street": "789 Oak St",
          "city": "Houston",
          "state": "TX",
          "zipCode": "77002"
        },
        "members": [
          {
            "user": new mongoose.Types.ObjectId("65a1b2c3d4e5f67890123459"),
            "role": "admin",
            "joinedAt": new Date()
          }
        ],
        "deliveryDays": ["saturday"],
        "isPrivate": false,
        "rules": "1. Respect the garden\n2. Share harvests\n3. Contribute to maintenance"
      },
      {
        "name": "San Antonio Cooking Club",
        "description": "A group for cooking enthusiasts to share recipes and techniques.",
        "creator": new mongoose.Types.ObjectId("65a1b2c3d4e5f6789012345a"),
        "category": "cooking_club",
        "location": {
          "street": "101 River Walk",
          "city": "San Antonio",
          "state": "TX",
          "zipCode": "78205"
        },
        "members": [
          {
            "user": new mongoose.Types.ObjectId("65a1b2c3d4e5f6789012345a"),
            "role": "admin",
            "joinedAt": new Date()
          }
        ],
        "deliveryDays": ["wednesday"],
        "isPrivate": false,
        "rules": "1. Share recipes\n2. Respect dietary restrictions\n3. Clean up after cooking sessions"
      }
    ];

    await db.group.insertMany(groups);
    console.log(`${groups.length} groups inserted`);

    console.log("Database seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}
