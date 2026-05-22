const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    address: { type: String },
    birthday: { type: Date },
    anniversary: { type: Date },
    loyaltyPoints: { type: Number, default: 0 },
    notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);
