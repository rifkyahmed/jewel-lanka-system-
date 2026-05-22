const mongoose = require('mongoose');

const GoldRateSchema = new mongoose.Schema({
    rates: {
        gold_24k: { type: Number, required: true }, // Rate per gram
        gold_22k: { type: Number, required: true },
        gold_20k: { type: Number, required: true },
        gold_18k: { type: Number, required: true }
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('GoldRate', GoldRateSchema);
