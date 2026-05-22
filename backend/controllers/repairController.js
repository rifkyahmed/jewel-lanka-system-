const Repair = require('../models/Repair');
const Cashbook = require('../models/Cashbook');
const { logAudit } = require('../utils/auditLogger');

// @desc    Get all repairs
// @route   GET /api/repairs
// @access  Private
exports.getRepairs = async (req, res) => {
    try {
        const repairs = await Repair.find().populate('customerId').sort({ createdAt: -1 });
        res.json(repairs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create repair
// @route   POST /api/repairs
// @access  Private
exports.createRepair = async (req, res) => {
    try {
        const repairNumber = 'REP-' + Date.now().toString().slice(-6);
        const repair = await Repair.create({
            ...req.body,
            repairNumber
        });
        res.status(201).json(repair);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update repair status/payment
// @route   PUT /api/repairs/:id
// @access  Private
exports.updateRepair = async (req, res) => {
    try {
        const repair = await Repair.findById(req.params.id);
        if (repair) {
            const beforeState = repair.toObject();
            const oldStatus = repair.status;
            Object.assign(repair, req.body);
            
            if (req.body.status === 'Delivered' && oldStatus !== 'Delivered') {
                repair.paymentStatus = 'Paid';
                repair.completedDate = new Date();
                
                // Trigger Cashbook log
                await Cashbook.create({
                    type: 'Income',
                    category: 'Repair',
                    amount: repair.estimatedCost,
                    description: `Repair Settlement: ${repair.repairNumber} - ${repair.itemName}`,
                    paymentMethod: 'Cash',
                    referenceId: repair._id
                });
            }
            
            const updatedRepair = await repair.save();
            await logAudit({
                req,
                action: 'repair.update',
                entityType: 'Repair',
                entityId: updatedRepair._id,
                beforeState,
                afterState: updatedRepair
            });
            res.json(updatedRepair);
        } else {
            res.status(404).json({ message: 'Repair ticket not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete repair
// @route   DELETE /api/repairs/:id
// @access  Private (Admin only)
exports.deleteRepair = async (req, res) => {
    try {
        const repair = await Repair.findById(req.params.id);
        if (repair) {
            const beforeState = repair.toObject();
            await repair.deleteOne();
            await logAudit({
                req,
                action: 'repair.delete',
                entityType: 'Repair',
                entityId: repair._id,
                beforeState
            });
            res.json({ message: 'Repair ticket removed' });
        } else {
            res.status(404).json({ message: 'Repair ticket not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
