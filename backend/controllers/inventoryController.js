const Product = require('../models/Product');
const GoldRate = require('../models/GoldRate');
const { logAudit } = require('../utils/auditLogger');

const readCsvBody = (req) => {
    if (req.file && req.file.buffer) {
        return req.file.buffer.toString('utf8');
    }
    return req.body?.csv || '';
};

const parseCsvLine = (line) => {
    const cols = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"' && inQuotes && next === '"') {
            current += '"';
            i += 1;
            continue;
        }

        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        if (char === ',' && !inQuotes) {
            cols.push(current);
            current = '';
            continue;
        }

        current += char;
    }

    cols.push(current);
    return cols;
};

const generateSku = (name, category, metalType) => {
    const categoryCode = String(category || 'item').replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'ITM';
    const metalCode = String(metalType || 'gold').replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'GLD';
    const randomCode = Date.now().toString().slice(-6);
    const nameCode = String(name || '').replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || 'X';
    return `${categoryCode}-${metalCode}-${nameCode}${randomCode}`;
};

const getEffectiveStockQuantity = (product) => {
    if (product.stockQuantity === 0) return 0;
    if (Number.isFinite(Number(product.stockQuantity))) return Number(product.stockQuantity);
    return product.status === 'Sold' ? 0 : 1;
};

// Helper to get active rates
const getActiveRates = async () => {
    const rateDoc = await GoldRate.findOne().sort({ createdAt: -1 });
    if (rateDoc) return rateDoc.rates;
    // Fallback default rates
    return { gold_24k: 9500, gold_22k: 8700, gold_20k: 7916, gold_18k: 7125 };
};

// Helper to calculate pricing for a single product
const calculateProductPricing = (product, rates) => {
    let metalRate = 0;
    if (product.metalType === 'gold_24k') metalRate = rates.gold_24k;
    else if (product.metalType === 'gold_22k') metalRate = rates.gold_22k;
    else if (product.metalType === 'gold_20k') metalRate = rates.gold_20k;
    else if (product.metalType === 'gold_18k') metalRate = rates.gold_18k;
    else if (product.metalType === 'silver_925') metalRate = 120; // fallback silver rate
    else if (product.metalType === 'platinum') metalRate = 3500; // fallback platinum rate

    const metalCost = product.metalWeightGrams * metalRate;
    const makingCharges = (product.makingChargePerGram * product.metalWeightGrams) + product.makingChargeFixed;
    
    let gemsCost = 0;
    if (product.gemstones && product.gemstones.length > 0) {
        gemsCost = product.gemstones.reduce((sum, gem) => sum + (gem.cost || 0), 0);
    }

    const total = Math.round(metalCost + makingCharges + gemsCost);

    return {
        metalValue: Math.round(metalCost),
        makingCharges: Math.round(makingCharges),
        gemsValue: Math.round(gemsCost),
        total
    };
};

// @desc    Get all products
// @route   GET /api/inventory
// @access  Private
exports.getProducts = async (req, res) => {
    try {
        const rates = await getActiveRates();
        const products = await Product.find().populate('supplierId');
        
        const productsWithPrice = products.map(product => {
            const pricing = calculateProductPricing(product, rates);
            return {
                ...product.toObject(),
                stockQuantity: getEffectiveStockQuantity(product),
                pricing
            };
        });

        res.json(productsWithPrice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get product by ID
// @route   GET /api/inventory/:id
// @access  Private
exports.getProductById = async (req, res) => {
    try {
        const rates = await getActiveRates();
        const product = await Product.findById(req.params.id).populate('supplierId');
        if (product) {
            const pricing = calculateProductPricing(product, rates);
            res.json({
                ...product.toObject(),
                stockQuantity: getEffectiveStockQuantity(product),
                pricing
            });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create product
// @route   POST /api/inventory
// @access  Private (Admin or Inventory Manager)
exports.createProduct = async (req, res) => {
    try {
        const payload = { ...req.body };
        payload.sku = String(payload.sku || '').trim() || generateSku(payload.name, payload.category, payload.metalType);
        payload.stockQuantity = String(payload.stockQuantity ?? '').trim() === '' ? 1 : Math.max(0, Number(payload.stockQuantity) || 0);
        payload.status = payload.stockQuantity > 0 ? (payload.status || 'In_Showcase') : 'Sold';
        const product = await Product.create(payload);
        const savedProduct = await Product.findById(product._id).populate('supplierId');
        res.status(201).json(savedProduct || product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update product
// @route   PUT /api/inventory/:id
// @access  Private (Admin or Inventory Manager)
exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            const beforeState = product.toObject();
            console.log('inventory.update request body:', req.body);
            const nextPayload = { ...req.body };
            if (req.body.sku !== undefined) {
                nextPayload.sku = String(req.body.sku).trim() || product.sku;
            }
            if (nextPayload.supplierId && typeof nextPayload.supplierId === 'object') {
                nextPayload.supplierId = nextPayload.supplierId._id || nextPayload.supplierId.id || '';
            }
            if (nextPayload.stockQuantity !== undefined) {
                // Log incoming value for debugging persistence issues
                console.log('inventory.update incoming stockQuantity:', nextPayload.stockQuantity, 'type:', typeof nextPayload.stockQuantity);
                const raw = nextPayload.stockQuantity;
                const rawTrim = String(raw ?? '').trim();
                if (rawTrim === '') {
                    nextPayload.stockQuantity = (product.stockQuantity ?? 0);
                } else {
                    const parsed = parseInt(rawTrim, 10);
                    if (!Number.isFinite(parsed)) {
                        const parsedFloat = parseFloat(rawTrim);
                        nextPayload.stockQuantity = Number.isFinite(parsedFloat) ? Math.max(0, Math.floor(parsedFloat)) : (product.stockQuantity ?? 0);
                    } else {
                        nextPayload.stockQuantity = Math.max(0, parsed);
                    }
                }
                nextPayload.status = nextPayload.stockQuantity > 0 ? 'In_Showcase' : 'Sold';
            }
            if (nextPayload.status === 'Sold' && Number(nextPayload.stockQuantity) > 0) {
                nextPayload.status = 'In_Showcase';
            }
            // Use findByIdAndUpdate to return the updated document directly
            const updatedProduct = await Product.findByIdAndUpdate(req.params.id, { $set: nextPayload }, { new: true, runValidators: true }).populate('supplierId');
            console.log('inventory.update saved product (post-update) stockQuantity:', updatedProduct && updatedProduct.stockQuantity);
            await logAudit({
                req,
                action: 'inventory.update',
                entityType: 'Product',
                entityId: updatedProduct._id,
                beforeState,
                afterState: updatedProduct
            });
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete product
// @route   DELETE /api/inventory/:id
// @access  Private (Admin only)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            const beforeState = product.toObject();
            await product.deleteOne();
            await logAudit({
                req,
                action: 'inventory.delete',
                entityType: 'Product',
                entityId: product._id,
                beforeState
            });
            res.json({ message: 'Product removed' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Export inventory as CSV
// @route GET /api/inventory/export
// @access Private
exports.exportProductsCSV = async (req, res) => {
    try {
        const products = await Product.find().populate('supplierId');
        const headers = ['sku','name','category','metalType','metalWeightGrams','stockQuantity','makingChargePerGram','makingChargeFixed','status','supplier'];
        const lines = [headers.join(',')];
        products.forEach(p => {
            const stockQuantity = getEffectiveStockQuantity(p);
            const row = [p.sku,p.name,p.category,p.metalType,p.metalWeightGrams,stockQuantity,p.makingChargePerGram,p.makingChargeFixed,p.status, (p.supplierId && p.supplierId.name) || ''];
            lines.push(row.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(','));
        });
        res.setHeader('Content-Type','text/csv');
        res.setHeader('Content-Disposition','attachment; filename="inventory_export.csv"');
        res.send(lines.join('\n'));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc Import products from CSV (simple, expects header)
// @route POST /api/inventory/import
// @access Private (Admin or Inventory_Manager)
exports.importProductsCSV = async (req, res) => {
    try {
        const csv = readCsvBody(req);
        if (!csv) return res.status(400).json({ message: 'CSV content required in body.csv' });
        const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const header = lines.shift().split(',').map(h => h.replace(/"/g,'').trim());
        const created = [];
        for (const line of lines) {
            const cols = parseCsvLine(line);
            const obj = {};
            header.forEach((h,i) => obj[h] = cols[i] || '');
            // create product minimal mapping
            const payload = {
                sku: obj.sku,
                name: obj.name,
                category: obj.category || 'Other',
                metalType: obj.metalType || 'gold_22k',
                metalWeightGrams: Number(obj.metalWeightGrams) || 0,
                stockQuantity: String(obj.stockQuantity ?? '').trim() === '' ? 1 : Math.max(0, Number(obj.stockQuantity) || 0),
                makingChargePerGram: Number(obj.makingChargePerGram) || 0,
                makingChargeFixed: Number(obj.makingChargeFixed) || 0,
                status: obj.status || 'In_Showcase'
            };
            const p = await Product.create(payload);
            created.push(p);
        }
        res.json({ created: created.length });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
