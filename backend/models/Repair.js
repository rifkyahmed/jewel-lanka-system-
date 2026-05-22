const mongoose = require('mongoose');

const RepairSchema = new mongoose.Schema({
    repairNumber: { type: String, required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    itemName: { type: String, required: true },
    description: { type: String, required: true },
    estimatedWeight: { type: Number },
    estimatedCost: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['Received', 'In_Progress', 'Ready', 'Delivered'], 
        default: 'Received' 
    },
    paymentStatus: {
        type: String,
        enum: ['Unpaid', 'Paid'],
        default: 'Unpaid'
    },
    receivedDate: { type: Date, default: Date.now },
    completedDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Repair', RepairSchema);
