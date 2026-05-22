const Supplier = require('../models/Supplier');
const { logAudit } = require('../utils/auditLogger');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
exports.getSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.find();
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create supplier
// @route   POST /api/suppliers
// @access  Private (Admin / Inventory_Manager)
exports.createSupplier = async (req, res) => {
    const { name, contactPerson, phone, email, address, metalTypeSupplied, outstandingBalance } = req.body;

    try {
        const supplier = await Supplier.create({
            name, contactPerson, phone, email, address,
            metalTypeSupplied: metalTypeSupplied || [],
            outstandingBalance: Number(outstandingBalance || 0)
        });

        res.status(201).json(supplier);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private (Admin / Inventory_Manager)
exports.updateSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        const beforeState = supplier.toObject();
        supplier.name = req.body.name || supplier.name;
        supplier.contactPerson = req.body.contactPerson || supplier.contactPerson;
        supplier.phone = req.body.phone || supplier.phone;
        supplier.email = req.body.email || supplier.email;
        supplier.address = req.body.address || supplier.address;
        supplier.metalTypeSupplied = req.body.metalTypeSupplied || supplier.metalTypeSupplied;
        supplier.outstandingBalance = req.body.outstandingBalance !== undefined ? Number(req.body.outstandingBalance) : supplier.outstandingBalance;

        const updatedSupplier = await supplier.save();
        await logAudit({
            req,
            action: 'supplier.update',
            entityType: 'Supplier',
            entityId: updatedSupplier._id,
            beforeState,
            afterState: updatedSupplier
        });
        res.json(updatedSupplier);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private (Admin only)
exports.deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        const beforeState = supplier.toObject();
        await supplier.deleteOne();
        await logAudit({
            req,
            action: 'supplier.delete',
            entityType: 'Supplier',
            entityId: supplier._id,
            beforeState
        });
        res.json({ message: 'Supplier removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
