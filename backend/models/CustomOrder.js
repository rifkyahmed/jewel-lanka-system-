const mongoose = require('mongoose');

const customOrderSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    customerName: {
        type: String
    },
    itemName: {
        type: String,
        required: true
    },
    designNotes: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    metalType: {
        type: String,
        required: true
    },
    estimatedWeight: {
        type: Number
    },
    quotedPrice: {
        type: Number,
        required: true
    },
    advancePayment: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Pending', 'In_Production', 'Ready', 'Delivered'],
        default: 'Pending'
    },
    paymentStatus: {
        type: String,
        enum: ['Unpaid', 'Partial', 'Paid'],
        default: 'Unpaid'
    }
}, { timestamps: true });

module.exports = mongoose.model('CustomOrder', customOrderSchema);
