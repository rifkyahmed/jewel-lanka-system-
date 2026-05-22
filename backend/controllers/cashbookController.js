const Cashbook = require('../models/Cashbook');
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

// @desc    Get all cashbook entries
// @route   GET /api/cashbook
// @access  Private
exports.getCashbookEntries = async (req, res) => {
    try {
        const entries = await Cashbook.find().sort({ entryDate: -1 });
        res.json(entries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create cashbook entry
// @route   POST /api/cashbook
// @access  Private (Admin / Cashier)
exports.createCashbookEntry = async (req, res) => {
    const { type, category, amount, description, paymentMethod, referenceId } = req.body;

    if (!type || !category || !amount || !description) {
        return res.status(400).json({ message: 'Type, category, amount, and description are required' });
    }

    try {
        const entry = await Cashbook.create({
            type,
            category,
            amount: Number(amount),
            description,
            paymentMethod: paymentMethod || 'Cash',
            referenceId: referenceId || null
        });

        res.status(201).json(entry);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete cashbook entry
// @route   DELETE /api/cashbook/:id
// @access  Private (Admin only)
exports.deleteCashbookEntry = async (req, res) => {
    try {
        const entry = await Cashbook.findById(req.params.id);
        if (!entry) {
            return res.status(404).json({ message: 'Cashbook entry not found' });
        }

        const beforeState = entry.toObject();
        await entry.deleteOne();
        await logAudit({
            req,
            action: 'cashbook.delete',
            entityType: 'Cashbook',
            entityId: entry._id,
            beforeState
        });
        res.json({ message: 'Cashbook entry removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Export ledger as CSV
exports.exportCashbookCSV = async (req, res) => {
    try {
        const entries = await Cashbook.find().sort({ entryDate: -1 });
        const headers = ['entryDate','type','category','amount','description','paymentMethod','referenceId'];
        const lines = [headers.join(',')];
        entries.forEach(e => {
            const row = [e.entryDate.toISOString(), e.type, e.category, e.amount, e.description, e.paymentMethod, e.referenceId || ''];
            lines.push(row.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(','));
        });
        res.setHeader('Content-Type','text/csv');
        res.setHeader('Content-Disposition','attachment; filename="cashbook_export.csv"');
        res.send(lines.join('\n'));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Import ledger CSV; expects header and basic columns
exports.importCashbookCSV = async (req, res) => {
    try {
        const csv = readCsvBody(req);
        if (!csv) return res.status(400).json({ message: 'CSV content required in body.csv' });
        const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const header = lines.shift().split(',').map(h => h.replace(/"/g,'').trim());
        let created = 0;
        for (const line of lines) {
            const cols = parseCsvLine(line);
            const obj = {};
            header.forEach((h,i) => obj[h] = cols[i] || '');
            await Cashbook.create({
                entryDate: obj.entryDate ? new Date(obj.entryDate) : new Date(),
                type: obj.type || 'Expense',
                category: obj.category || 'Other',
                amount: Number(obj.amount) || 0,
                description: obj.description || '',
                paymentMethod: obj.paymentMethod || 'Cash',
                referenceId: obj.referenceId || null
            });
            created++;
        }
        res.json({ created });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
