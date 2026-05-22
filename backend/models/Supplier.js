const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    metalTypeSupplied: [{ type: String, enum: ['Gold', 'Silver', 'Gemstones', 'Diamonds', 'Platinum'] }],
    outstandingBalance: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', SupplierSchema);
