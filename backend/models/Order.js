const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
    sku: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String },
    metalType: { type: String },
    metalWeightGrams: { type: Number },
    metalRateApplied: { type: Number }, // Frozen rate at checkout
    makingChargeApplied: { type: Number },
    gemstoneValueApplied: { type: Number },
    subtotal: { type: Number }
});

const OrderSchema = new mongoose.Schema({
    invoiceNumber: { type: String, required: true, unique: true },
    saleDate: { type: Date, default: Date.now },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    salesRepId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [OrderItemSchema],
    goldExchange: {
        weightGrams: { type: Number, default: 0 },
        rateApplied: { type: Number, default: 0 },
        totalValue: { type: Number, default: 0 }
    },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    paymentStatus: {
        type: String,
        enum: ['Paid', 'Partial', 'Unpaid'],
        default: 'Paid'
    },
    finalAmount: { type: Number, required: true },
    paymentMethod: { 
        type: String, 
        enum: ['Cash', 'Card', 'GoldExchange', 'Split', 'BankTransfer'], 
        required: true 
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
