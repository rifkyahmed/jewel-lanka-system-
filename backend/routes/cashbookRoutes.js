const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getCashbookEntries, createCashbookEntry, deleteCashbookEntry } = require('../controllers/cashbookController');
const { exportCashbookCSV, importCashbookCSV } = require('../controllers/cashbookController');
const { protect, authorize } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

router.route('/')
    .get(protect, getCashbookEntries)
    .post(protect, authorize('Admin'), createCashbookEntry);

router.route('/:id')
    .delete(protect, authorize('Admin'), deleteCashbookEntry);

router.get('/export', protect, exportCashbookCSV);
router.post('/import', protect, authorize('Admin'), upload.single('csvFile'), importCashbookCSV);

module.exports = router;
