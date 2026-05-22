const express = require('express');
const router = express.Router();
const { getCurrentRates, updateRates, getRateHistory } = require('../controllers/rateController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getCurrentRates)
    .post(protect, authorize('Admin'), updateRates);

router.get('/history', protect, getRateHistory);

module.exports = router;
