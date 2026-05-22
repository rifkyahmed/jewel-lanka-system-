const express = require('express');
const router = express.Router();
const { getSuppliers, createSupplier, updateSupplier, deleteSupplier } = require('../controllers/supplierController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getSuppliers)
    .post(protect, authorize('Admin', 'Inventory_Manager'), createSupplier);

router.route('/:id')
    .put(protect, authorize('Admin', 'Inventory_Manager'), updateSupplier)
    .delete(protect, authorize('Admin'), deleteSupplier);

module.exports = router;
