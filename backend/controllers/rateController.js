const GoldRate = require('../models/GoldRate');

// @desc    Get current gold rates
// @route   GET /api/rates
// @access  Private
exports.getCurrentRates = async (req, res) => {
    try {
        const rate = await GoldRate.findOne().sort({ createdAt: -1 });
        if (rate) {
            res.json(rate);
        } else {
            // Default fallback rate if database is fresh/empty
            res.json({
                rates: { gold_24k: 9500, gold_22k: 8700, gold_20k: 7916, gold_18k: 7125 }
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update gold rates
// @route   POST /api/rates
// @access  Private (Admin only)
exports.updateRates = async (req, res) => {
    const { gold_24k, gold_22k, gold_20k, gold_18k } = req.body;

    if (!gold_24k || !gold_22k || !gold_20k || !gold_18k) {
        return res.status(400).json({ message: 'All karat rates are required' });
    }

    try {
        const newRate = await GoldRate.create({
            rates: {
                gold_24k: Number(gold_24k),
                gold_22k: Number(gold_22k),
                gold_20k: Number(gold_20k),
                gold_18k: Number(gold_18k)
            },
            updatedBy: req.user._id
        });

        res.status(201).json(newRate);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get rate history for charts
// @route   GET /api/rates/history
// @access  Private
exports.getRateHistory = async (req, res) => {
    try {
        const history = await GoldRate.find().sort({ createdAt: 1 }).limit(30);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
