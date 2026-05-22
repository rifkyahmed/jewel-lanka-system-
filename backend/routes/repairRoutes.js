const express = require('express');
const router = express.Router();
const { getRepairs, createRepair, updateRepair, deleteRepair } = require('../controllers/repairController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getRepairs)
    .post(protect, authorize('Admin', 'Cashier', 'Sales_Staff'), createRepair);

router.route('/:id')
    .put(protect, authorize('Admin', 'Cashier', 'Sales_Staff'), updateRepair)
    .delete(protect, authorize('Admin'), deleteRepair);

module.exports = router;
