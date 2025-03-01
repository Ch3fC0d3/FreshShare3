const mongoose = require("mongoose");

const Group = mongoose.model(
    "Group",
    new mongoose.Schema({
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        members: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            role: {
                type: String,
                enum: ["admin", "moderator", "member"],
                default: "member"
            },
            joinedAt: {
                type: Date,
                default: Date.now
            }
        }],
        category: {
            type: String,
            enum: ["neighborhood", "community_garden", "food_bank", "cooking_club", "other"],
            required: true
        },
        location: {
            street: String,
            city: {
                type: String,
                required: true
            },
            state: String,
            zipCode: {
                type: String,
                required: true
            },
            coordinates: {
                type: {
                    type: String,
                    enum: ['Point'],
                    default: 'Point'
                },
                coordinates: {
                    type: [Number], // [longitude, latitude]
                    default: [0, 0]
                }
            }
        },
        organizers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        shoppingList: [{
            productName: String,
            vendor: String,
            casePrice: Number,
            quantity: Number,
            totalUnits: Number
        }],
        proposedProducts: [{
            productName: String,
            vendor: String,
            casePrice: Number,
            quantity: Number,
            votes: { 
                type: Number, 
                default: 0 
            },
            approved: { 
                type: Boolean, 
                default: false 
            }
        }],
        deliveryDays: {
            type: [String], // Example: ["Monday", "Thursday"]
            required: true
        },
        discussionBoard: [{
            user: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: "User" 
            },
            message: String,
            timestamp: { 
                type: Date, 
                default: Date.now 
            }
        }],
        isPrivate: {
            type: Boolean,
            default: false
        },
        rules: {
            type: String,
            default: ""
        },
        events: [{
            title: String,
            description: String,
            date: Date,
            location: String,
            attendees: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }]
        }],
        stats: {
            activeMembers: { 
                type: Number, 
                default: 0 
            },
            totalProductsOrdered: { 
                type: Number, 
                default: 0 
            },
            pastOrders: [{ 
                type: mongoose.Schema.Types.ObjectId, 
                ref: "Order" 
            }]
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }, {
        timestamps: true
    })
);

module.exports = Group;
