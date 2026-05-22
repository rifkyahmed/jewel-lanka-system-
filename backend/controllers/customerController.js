const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { logAudit } = require('../utils/auditLogger');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
exports.getCustomers = async (req, res) => {
    try {
        const customers = await Customer.find().sort({ name: 1 });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get customer by ID
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomerById = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (customer) {
            const history = await Order.find({ customerId: customer._id }).sort({ saleDate: -1 });
            res.json({
                customer,
                purchaseHistory: history
            });
        } else {
            res.status(404).json({ message: 'Customer not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
exports.createCustomer = async (req, res) => {
    try {
        const customer = await Customer.create(req.body);
        res.status(201).json(customer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (customer) {
            const beforeState = customer.toObject();
            Object.assign(customer, req.body);
            const updatedCustomer = await customer.save();
            await logAudit({
                req,
                action: 'customer.update',
                entityType: 'Customer',
                entityId: updatedCustomer._id,
                beforeState,
                afterState: updatedCustomer
            });
            res.json(updatedCustomer);
        } else {
            res.status(404).json({ message: 'Customer not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private (Admin only)
exports.deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (customer) {
            const beforeState = customer.toObject();
            await customer.deleteOne();
            await logAudit({
                req,
                action: 'customer.delete',
                entityType: 'Customer',
                entityId: customer._id,
                beforeState
            });
            res.json({ message: 'Customer removed' });
        } else {
            res.status(404).json({ message: 'Customer not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
