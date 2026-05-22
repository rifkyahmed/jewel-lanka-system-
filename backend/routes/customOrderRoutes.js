const express = require('express');
const router = express.Router();
const customOrderController = require('../controllers/customOrderController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', customOrderController.getCustomOrders);
router.post('/', customOrderController.addCustomOrder);
router.put('/:id', customOrderController.updateCustomOrder);
router.delete('/:id', customOrderController.deleteCustomOrder);
router.get('/:id/pdf', customOrderController.generateInvoicePDF);

module.exports = router;
