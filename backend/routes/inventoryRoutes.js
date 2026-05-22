const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getProducts, getProductById, createProduct, updateProduct, deleteProduct } = require('../controllers/inventoryController');
const { exportProductsCSV, importProductsCSV } = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

router.route('/')
    .get(protect, getProducts)
    .post(protect, authorize('Admin', 'Inventory_Manager'), createProduct);

router.get('/export', protect, exportProductsCSV);
router.post('/import', protect, authorize('Admin','Inventory_Manager'), upload.single('csvFile'), importProductsCSV);

router.route('/:id')
    .get(protect, getProductById)
    .put(protect, authorize('Admin', 'Inventory_Manager'), updateProduct)
    .delete(protect, authorize('Admin'), deleteProduct);

module.exports = router;
