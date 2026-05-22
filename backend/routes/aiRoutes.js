const express = require('express');
const router = express.Router();
const { chatWithJewelBot, generateDescription, generateInsights, generateCustomerProfile, estimateRepairCost, generateMarketingCampaign, predictMarket } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.post('/chat', protect, chatWithJewelBot);
router.post('/generate-description', protect, generateDescription);
router.post('/insights', protect, generateInsights);
router.post('/customer-profile', protect, generateCustomerProfile);
router.post('/estimate-repair', protect, estimateRepairCost);
router.post('/marketing-campaign', protect, generateMarketingCampaign);
router.post('/predict-market', protect, predictMarket);

module.exports = router;
