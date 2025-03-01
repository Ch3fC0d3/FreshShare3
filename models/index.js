const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;

db.user = require("./user.model");
db.role = require("./role.model");
db.message = require("./message.model");
db.group = require("./group.model");
db.listing = require("./listing.model");
db.order = require("./order.model");

db.ROLES = ["user", "admin", "moderator"];

module.exports = db;