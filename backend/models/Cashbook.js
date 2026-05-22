const mongoose = require('mongoose');

const CashbookSchema = new mongoose.Schema({
    entryDate: { type: Date, default: Date.now },
    type: { 
        type: String, 
        enum: ['Income', 'Expense'], 
        required: true 
    },
    category: { 
        type: String, 
        enum: ['Sale', 'Repair', 'Salary', 'Rent', 'Utilities', 'SupplierPayment', 'Other'], 
        required: true 
    },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    paymentMethod: { 
        type: String, 
        enum: ['Cash', 'Card', 'BankTransfer', 'GoldExchange'], 
        default: 'Cash' 
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId }
}, { timestamps: true });

module.exports = mongoose.model('Cashbook', CashbookSchema);
