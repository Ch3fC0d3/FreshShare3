const mongoose = require("mongoose");

const Group = mongoose.model(
    "Group",
    new mongoose.Schema({
        name: {
            type: String,
            required: true,
            unique: true
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
            city: String,
            state: String,
            zipCode: String,
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
