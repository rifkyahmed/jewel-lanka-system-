const mongoose = require('mongoose');

const GemstoneSchema = new mongoose.Schema({
    gemType: { type: String, required: true }, // e.g. Diamond, Ruby, Emerald, Sapphire
    carats: { type: Number, required: true },
    cut: { type: String },
    clarity: { type: String },
    cost: { type: Number, default: 0 }
});

const ProductSchema = new mongoose.Schema({
    sku: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { 
        type: String, 
        enum: ['Ring', 'Necklace', 'Bracelet', 'Earring', 'Bangle', 'Pendant', 'Other'], 
        required: true 
    },
    metalType: { 
        type: String, 
        enum: ['gold_24k', 'gold_22k', 'gold_20k', 'gold_18k', 'silver_925', 'platinum'], 
        required: true 
    },
    metalWeightGrams: { type: Number, required: true },
    stockQuantity: { type: Number, default: 1, min: 0 },
    makingChargePerGram: { type: Number, default: 0 },
    makingChargeFixed: { type: Number, default: 0 },
    gemstones: [GemstoneSchema],
    specifications: {
        ringSize: { type: String },
        certNumber: { type: String }
    },
    status: { 
        type: String, 
        enum: ['In_Showcase', 'Sold', 'Melted', 'Repair'], 
        default: 'In_Showcase' 
    },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    enteredStockDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
