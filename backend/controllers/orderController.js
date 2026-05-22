const Order = require('../models/Order');
const Product = require('../models/Product');
const GoldRate = require('../models/GoldRate');
const Cashbook = require('../models/Cashbook');
const Customer = require('../models/Customer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Helper to get active rates
const getActiveRates = async () => {
    const rateDoc = await GoldRate.findOne().sort({ createdAt: -1 });
    if (rateDoc) return rateDoc.rates;
    return { gold_24k: 9500, gold_22k: 8700, gold_20k: 7916, gold_18k: 7125 };
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('customerId').populate('salesRepId').sort({ saleDate: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get order by invoice number
// @route   GET /api/orders/:invoiceNumber
// @access  Private
exports.getOrderByInvoice = async (req, res) => {
    try {
        const order = await Order.findOne({ invoiceNumber: req.params.invoiceNumber })
            .populate('customerId')
            .populate('salesRepId');
        if (order) {
            res.json(order);
        } else {
            res.status(404).json({ message: 'Invoice not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Checkout manual POS sales order
// @route   POST /api/orders
// @access  Private
exports.checkoutOrder = async (req, res) => {
    const { customerId, items, goldExchange, discountAmount, taxAmount, paymentMethod } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'Cart items are required' });
    }

    try {
        const rates = await getActiveRates();
        const invoiceNumber = 'INV-' + Date.now().toString().slice(-6);

        let orderItems = [];
        let itemsSum = 0;

        for (const item of items) {
            const product = await Product.findOne({ sku: item.sku });
            if (!product) {
                return res.status(404).json({ message: `Product SKU ${item.sku} not found` });
            }
            if (product.status !== 'In_Showcase') {
                return res.status(400).json({ message: `Product SKU ${item.sku} is already sold, melted, or under repair` });
            }
            if ((product.stockQuantity ?? 1) <= 0) {
                return res.status(400).json({ message: `Product SKU ${item.sku} is out of stock` });
            }

            // Get metal rate applied at checkout
            let metalRate = 0;
            if (product.metalType === 'gold_24k') metalRate = rates.gold_24k;
            else if (product.metalType === 'gold_22k') metalRate = rates.gold_22k;
            else if (product.metalType === 'gold_20k') metalRate = rates.gold_20k;
            else if (product.metalType === 'gold_18k') metalRate = rates.gold_18k;
            else if (product.metalType === 'silver_925') metalRate = 120;
            else if (product.metalType === 'platinum') metalRate = 3500;

            const makingChargeApplied = (product.makingChargePerGram * product.metalWeightGrams) + product.makingChargeFixed;
            const gemstoneValueApplied = product.gemstones ? product.gemstones.reduce((sum, g) => sum + (g.cost || 0), 0) : 0;
            const subtotal = Math.round((product.metalWeightGrams * metalRate) + makingChargeApplied + gemstoneValueApplied);

            orderItems.push({
                sku: product.sku,
                name: product.name,
                category: product.category,
                metalType: product.metalType,
                metalWeightGrams: product.metalWeightGrams,
                metalRateApplied: metalRate,
                makingChargeApplied,
                gemstoneValueApplied,
                subtotal
            });

            itemsSum += subtotal;

            product.stockQuantity = Math.max(0, (product.stockQuantity ?? 1) - 1);
            if (product.stockQuantity === 0) {
                product.status = 'Sold';
            } else {
                product.status = 'In_Showcase';
            }
            await product.save();
        }

        // Calculate gold exchange value
        let exchangeValue = 0;
        if (goldExchange && goldExchange.weightGrams && goldExchange.rateApplied) {
            exchangeValue = Math.round(goldExchange.weightGrams * goldExchange.rateApplied);
        }

        const disc = discountAmount ? Number(discountAmount) : 0;
        const tax = taxAmount ? Number(taxAmount) : 0;
        const finalAmount = Math.max(0, Math.round(itemsSum + tax - disc - exchangeValue));
        const amountPaid = req.body.amountPaid !== undefined ? Number(req.body.amountPaid) : finalAmount;
        const balanceDue = Math.max(0, finalAmount - amountPaid);
        const paymentStatus = balanceDue > 0 ? (amountPaid > 0 ? 'Partial' : 'Unpaid') : 'Paid';

        const order = await Order.create({
            invoiceNumber,
            customerId: customerId || null,
            salesRepId: req.user._id,
            items: orderItems,
            goldExchange: {
                weightGrams: goldExchange?.weightGrams || 0,
                rateApplied: goldExchange?.rateApplied || 0,
                totalValue: exchangeValue
            },
            discountAmount: disc,
            taxAmount: tax,
            amountPaid,
            balanceDue,
            paymentStatus,
            finalAmount,
            paymentMethod
        });

        // Log transaction in Cashbook ledger
        await Cashbook.create({
            type: 'Income',
            category: 'Sale',
            amount: finalAmount,
            description: `Sales Invoice settlement: ${invoiceNumber}`,
            paymentMethod,
            referenceId: order._id
        });

        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate invoice PDF for an order
// @route   GET /api/orders/:invoiceNumber/pdf
// @access  Private
exports.generateInvoicePDF = async (req, res) => {
    try {
        const order = await Order.findOne({ invoiceNumber: req.params.invoiceNumber })
            .populate('customerId')
            .populate('salesRepId');
        if (!order) return res.status(404).json({ message: 'Invoice not found' });

        const theme = { primary: '#0f172a', accent: '#0b5f4b', muted: '#475569', light: '#f1f5f9', white: '#ffffff', gold: '#d4af37' };

        const doc = new PDFDocument({ size: 'A4', margin: 0 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${order.invoiceNumber}.pdf"`);

        doc.pipe(res);

        const companyName = process.env.COMPANY_NAME || 'jewel lanka';
        const companyAddress = process.env.COMPANY_ADDRESS || 'No. 1, Main Street, Colombo';
        const companyPhone = process.env.COMPANY_PHONE || '+94 77 123 4567';
        const companyLogoPath = process.env.COMPANY_LOGO_PATH ? path.resolve(process.env.COMPANY_LOGO_PATH) : '';
        const orderDate = order.saleDate ? new Date(order.saleDate) : new Date();

        // FULL WIDTH HEADER
        doc.rect(0, 0, 595, 120).fill(theme.primary);
        
        if (companyLogoPath && fs.existsSync(companyLogoPath)) {
            doc.image(companyLogoPath, 40, 35, { fit: [50, 50] });
        } else {
            doc.circle(65, 60, 25).lineWidth(2).stroke(theme.gold);
            doc.fillColor(theme.gold).fontSize(20).text('JL', 40, 48, { width: 50, align: 'center' });
        }

        doc.fillColor(theme.white).fontSize(24).font('Helvetica-Bold').text(companyName.toUpperCase(), 110, 40);
        doc.fillColor(theme.gold).fontSize(10).font('Helvetica').text('FINE JEWELRY & GEMSTONES', 110, 70);

        doc.fillColor(theme.white).fontSize(10).text(companyAddress, 380, 40, { align: 'right', width: 175 });
        doc.text(`Tel: ${companyPhone}`, 380, 55, { align: 'right', width: 175 });
        doc.text(`Email: hello@jewellanka.com`, 380, 70, { align: 'right', width: 175 });

        // INVOICE META
        doc.rect(0, 120, 595, 40).fill(theme.light);
        doc.fillColor(theme.primary).fontSize(14).font('Helvetica-Bold').text('TAX INVOICE / SALE RECEIPT', 40, 132);
        
        doc.fontSize(10).font('Helvetica').fillColor(theme.muted);
        doc.text(`Invoice Ref: ${order.invoiceNumber}`, 350, 134, { width: 100, align: 'right' });
        doc.text(`Date: ${orderDate.toLocaleDateString()}`, 460, 134, { width: 95, align: 'right' });

        // CUSTOMER DETAILS & PROJECT
        let currentY = 190;
        
        // Left Column: Customer
        doc.fillColor(theme.primary).fontSize(11).font('Helvetica-Bold').text('CLIENT DETAILS', 40, currentY);
        doc.moveTo(40, currentY + 15).lineTo(250, currentY + 15).lineWidth(1).stroke(theme.light);
        
        doc.fillColor(theme.muted).fontSize(10).font('Helvetica');
        const cust = order.customerId;
        const custName = cust ? cust.name : 'Walk-in Client';
        const custPhone = cust ? cust.phone : 'No Phone Provided';
        doc.text(custName, 40, currentY + 25);
        doc.text(custPhone, 40, currentY + 40);

        // Right Column: Order Overview
        doc.fillColor(theme.primary).fontSize(11).font('Helvetica-Bold').text('ORDER OVERVIEW', 300, currentY);
        doc.moveTo(300, currentY + 15).lineTo(555, currentY + 15).stroke(theme.light);

        doc.fillColor(theme.muted).fontSize(10).font('Helvetica');
        doc.text('Sales Rep:', 300, currentY + 25);
        doc.fillColor(theme.primary).font('Helvetica-Bold').text(order.salesRepId?.name || 'System', 380, currentY + 25);
        
        doc.fillColor(theme.muted).font('Helvetica').text('Payment Method:', 300, currentY + 40);
        doc.fillColor(theme.primary).text(order.paymentMethod || 'Cash', 380, currentY + 40);
        
        doc.fillColor(theme.muted).font('Helvetica').text('Status:', 300, currentY + 55);
        doc.fillColor(theme.primary).text(order.paymentStatus || 'Paid', 380, currentY + 55);

        // ITEMS TABLE
        currentY += 95;
        doc.rect(40, currentY, 515, 26).fill('#eef2f7');
        doc.fillColor(theme.primary).fontSize(9).font('Helvetica-Bold');
        doc.text('SKU', 50, currentY + 8, { width: 80 });
        doc.text('Item Description', 130, currentY + 8, { width: 210 });
        doc.text('Weight', 340, currentY + 8, { width: 70, align: 'right' });
        doc.text('Subtotal', 450, currentY + 8, { width: 95, align: 'right' });
        
        currentY += 26;
        doc.font('Helvetica');

        order.items.forEach((item, index) => {
            const rowHeight = 22;
            if (index % 2 === 0) {
                doc.rect(40, currentY, 515, rowHeight).fill('#fafafa');
            }
            doc.fillColor(theme.primary).fontSize(9).text(item.sku, 50, currentY + 6, { width: 80 });
            doc.text(item.name, 130, currentY + 6, { width: 210 });
            doc.text(`${item.metalWeightGrams} g`, 340, currentY + 6, { width: 70, align: 'right' });
            doc.text(`Rs. ${item.subtotal.toLocaleString()}`, 450, currentY + 6, { width: 95, align: 'right' });
            currentY += rowHeight;
        });

        // FINANCIAL BREAKDOWN
        currentY += 20;
        doc.fillColor(theme.primary).fontSize(11).font('Helvetica-Bold').text('FINANCIAL SUMMARY', 300, currentY);
        doc.moveTo(300, currentY + 15).lineTo(555, currentY + 15).stroke(theme.light);
        
        const subtotal = order.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
        const exchangeValue = order.goldExchange?.totalValue || 0;
        const discountValue = order.discountAmount || 0;
        const taxValue = order.taxAmount || 0;

        doc.fillColor(theme.muted).fontSize(10).font('Helvetica');
        doc.text('Subtotal', 300, currentY + 25);
        doc.fillColor(theme.primary).text(`Rs. ${subtotal.toLocaleString()}`, 450, currentY + 25, { width: 105, align: 'right' });

        let summaryOffset = 45;
        if (exchangeValue > 0) {
            doc.fillColor(theme.muted).text('Gold Exchange Value', 300, currentY + summaryOffset);
            doc.fillColor(theme.primary).text(`- Rs. ${exchangeValue.toLocaleString()}`, 450, currentY + summaryOffset, { width: 105, align: 'right' });
            summaryOffset += 20;
        }
        if (discountValue > 0) {
            doc.fillColor(theme.muted).text('Discount', 300, currentY + summaryOffset);
            doc.fillColor(theme.primary).text(`- Rs. ${discountValue.toLocaleString()}`, 450, currentY + summaryOffset, { width: 105, align: 'right' });
            summaryOffset += 20;
        }
        if (taxValue > 0) {
            doc.fillColor(theme.muted).text('Tax', 300, currentY + summaryOffset);
            doc.fillColor(theme.primary).text(`+ Rs. ${taxValue.toLocaleString()}`, 450, currentY + summaryOffset, { width: 105, align: 'right' });
            summaryOffset += 20;
        }
        
        doc.moveTo(300, currentY + summaryOffset).lineTo(555, currentY + summaryOffset).stroke(theme.light);
        summaryOffset += 15;

        doc.fillColor(theme.primary).font('Helvetica-Bold').fontSize(12).text('TOTAL DUE', 300, currentY + summaryOffset);
        doc.fillColor(theme.accent).fontSize(14).text(`Rs. ${order.finalAmount.toLocaleString()}`, 430, currentY + summaryOffset - 1, { width: 125, align: 'right' });
        
        summaryOffset += 25;
        doc.fillColor(theme.muted).font('Helvetica').fontSize(10).text('Amount Paid', 300, currentY + summaryOffset);
        doc.fillColor(theme.primary).text(`Rs. ${(order.amountPaid || 0).toLocaleString()}`, 450, currentY + summaryOffset, { width: 105, align: 'right' });

        summaryOffset += 20;
        doc.fillColor(theme.muted).font('Helvetica').text('Balance Due', 300, currentY + summaryOffset);
        doc.fillColor(theme.primary).text(`Rs. ${(order.balanceDue || 0).toLocaleString()}`, 450, currentY + summaryOffset, { width: 105, align: 'right' });

        // TERMS AND CONDITIONS
        currentY = Math.max(currentY + summaryOffset + 40, currentY + 120);
        doc.rect(40, currentY, 515, 60).fill(theme.light);
        doc.fillColor(theme.primary).fontSize(9).font('Helvetica-Bold').text('TERMS & CONDITIONS', 50, currentY + 12);
        doc.fillColor(theme.muted).font('Helvetica').fontSize(8).text(
            '1. Prices and weights are final at the time of invoice issuance.\n' +
            '2. Returns are only accepted within 7 days with the original receipt and unchanged item condition.\n' +
            '3. Custom alterations may incur additional charges.', 
            50, currentY + 25, { lineGap: 2 }
        );

        // FOOTER
        doc.rect(0, 790, 595, 52).fill(theme.primary);
        doc.fillColor(theme.gold).fontSize(9).font('Helvetica').text('Thank you for choosing our fine jewelry services.', 0, 810, { align: 'center', width: 595 });

        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to generate PDF' });
    }
};
