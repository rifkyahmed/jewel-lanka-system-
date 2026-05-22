const express = require('express');
const router = express.Router();
const { getOrders, getOrderByInvoice, checkoutOrder, generateInvoicePDF } = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getOrders)
    .post(protect, checkoutOrder);

router.get('/:invoiceNumber/pdf', protect, generateInvoicePDF);
router.get('/:invoiceNumber', protect, getOrderByInvoice);

module.exports = router;
