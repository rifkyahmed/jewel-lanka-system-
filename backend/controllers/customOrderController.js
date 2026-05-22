const CustomOrder = require('../models/CustomOrder');

exports.getCustomOrders = async (req, res) => {
    try {
        const orders = await CustomOrder.find().populate('customerId', 'name phone email').sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addCustomOrder = async (req, res) => {
    try {
        const order = new CustomOrder(req.body);
        const savedOrder = await order.save();
        res.status(201).json(savedOrder);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateCustomOrder = async (req, res) => {
    try {
        const updated = await CustomOrder.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteCustomOrder = async (req, res) => {
    try {
        await CustomOrder.findByIdAndDelete(req.params.id);
        res.json({ message: 'Custom order deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

exports.generateInvoicePDF = async (req, res) => {
    try {
        const order = await CustomOrder.findById(req.params.id).populate('customerId');
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const theme = { primary: '#0f172a', accent: '#0b5f4b', muted: '#475569', light: '#f1f5f9', white: '#ffffff', gold: '#d4af37' };

        const doc = new PDFDocument({ size: 'A4', margin: 0 }); 
        const invoiceNumber = `CST-${order._id.toString().slice(-6).toUpperCase()}`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${invoiceNumber}.pdf"`);

        doc.pipe(res);

        const companyName = process.env.COMPANY_NAME || 'jewel lanka';
        const companyAddress = process.env.COMPANY_ADDRESS || 'No. 1, Main Street, Colombo';
        const companyPhone = process.env.COMPANY_PHONE || '+94 77 123 4567';
        const companyLogoPath = process.env.COMPANY_LOGO_PATH ? path.resolve(process.env.COMPANY_LOGO_PATH) : '';
        const orderDate = new Date(order.updatedAt || order.createdAt);

        // FULL WIDTH HEADER
        doc.rect(0, 0, 595, 120).fill(theme.primary);
        
        if (companyLogoPath && fs.existsSync(companyLogoPath)) {
            doc.image(companyLogoPath, 40, 35, { fit: [50, 50] });
        } else {
            doc.circle(65, 60, 25).lineWidth(2).stroke(theme.gold);
            doc.fillColor(theme.gold).fontSize(20).text('JL', 40, 48, { width: 50, align: 'center' });
        }

        doc.fillColor(theme.white).fontSize(24).font('Helvetica-Bold').text(companyName.toUpperCase(), 110, 40);
        doc.fillColor(theme.gold).fontSize(10).font('Helvetica').text('BESPOKE JEWELRY WORKSHOP', 110, 70);

        doc.fillColor(theme.white).fontSize(10).text(companyAddress, 380, 40, { align: 'right', width: 175 });
        doc.text(`Tel: ${companyPhone}`, 380, 55, { align: 'right', width: 175 });
        doc.text(`Email: hello@jewellanka.com`, 380, 70, { align: 'right', width: 175 });

        // INVOICE META
        doc.rect(0, 120, 595, 40).fill(theme.light);
        doc.fillColor(theme.primary).fontSize(14).font('Helvetica-Bold').text('CUSTOM ORDER AGREEMENT', 40, 132);
        
        doc.fontSize(10).font('Helvetica').fillColor(theme.muted);
        doc.text(`Order Ref: ${invoiceNumber}`, 350, 134, { width: 100, align: 'right' });
        doc.text(`Date: ${orderDate.toLocaleDateString()}`, 460, 134, { width: 95, align: 'right' });

        // CUSTOMER DETAILS & PROJECT
        let currentY = 190;
        
        // Left Column: Customer
        doc.fillColor(theme.primary).fontSize(11).font('Helvetica-Bold').text('CLIENT DETAILS', 40, currentY);
        doc.moveTo(40, currentY + 15).lineTo(250, currentY + 15).lineWidth(1).stroke(theme.light);
        
        doc.fillColor(theme.muted).fontSize(10).font('Helvetica');
        const cust = order.customerId;
        const custName = cust ? cust.name : (order.customerName || 'Walk-in Client');
        const custPhone = cust ? cust.phone : 'No Phone Provided';
        doc.text(custName, 40, currentY + 25);
        doc.text(custPhone, 40, currentY + 40);

        // Right Column: Specifications Overview
        doc.fillColor(theme.primary).fontSize(11).font('Helvetica-Bold').text('PROJECT OVERVIEW', 300, currentY);
        doc.moveTo(300, currentY + 15).lineTo(555, currentY + 15).stroke(theme.light);

        doc.fillColor(theme.muted).fontSize(10).font('Helvetica');
        doc.text('Project Name:', 300, currentY + 25);
        doc.fillColor(theme.primary).font('Helvetica-Bold').text(order.itemName, 380, currentY + 25);
        
        doc.fillColor(theme.muted).font('Helvetica').text('Category:', 300, currentY + 40);
        doc.fillColor(theme.primary).text(order.category || 'Bespoke', 380, currentY + 40);
        
        doc.fillColor(theme.muted).font('Helvetica').text('Metal Type:', 300, currentY + 55);
        doc.fillColor(theme.primary).text((order.metalType || 'gold_22k').replace('gold_','').toUpperCase(), 380, currentY + 55);

        // DESIGN SPECIFICATIONS BOX
        currentY += 100;
        doc.fillColor(theme.primary).fontSize(11).font('Helvetica-Bold').text('DESIGN SPECIFICATIONS & NOTES', 40, currentY);
        doc.moveTo(40, currentY + 15).lineTo(555, currentY + 15).stroke(theme.light);
        
        const notes = order.designNotes || 'No specific design notes provided.';
        const notesHeight = doc.font('Helvetica').fontSize(10).heightOfString(notes, { width: 495, lineGap: 4 });
        
        doc.rect(40, currentY + 25, 515, notesHeight + 30).fill('#f9fafb');
        doc.fillColor(theme.muted).text(notes, 50, currentY + 40, { width: 495, lineGap: 4 });

        currentY += notesHeight + 80;

        // FINANCIAL BREAKDOWN
        doc.fillColor(theme.primary).fontSize(11).font('Helvetica-Bold').text('FINANCIAL SUMMARY', 300, currentY);
        doc.moveTo(300, currentY + 15).lineTo(555, currentY + 15).stroke(theme.light);
        
        doc.fillColor(theme.muted).fontSize(10).font('Helvetica');
        doc.text('Agreed Quoted Price', 300, currentY + 25);
        doc.fillColor(theme.primary).text(`Rs. ${(order.quotedPrice || 0).toLocaleString()}`, 450, currentY + 25, { width: 105, align: 'right' });

        doc.fillColor(theme.muted).text('Advance Payment Received', 300, currentY + 45);
        doc.fillColor(theme.primary).text(`Rs. ${(order.advancePayment || 0).toLocaleString()}`, 450, currentY + 45, { width: 105, align: 'right' });
        
        doc.moveTo(300, currentY + 65).lineTo(555, currentY + 65).stroke(theme.light);

        const amountPaid = order.paymentStatus === 'Paid' ? order.quotedPrice : order.advancePayment;
        const balanceDue = (order.quotedPrice || 0) - (amountPaid || 0);

        doc.fillColor(theme.primary).font('Helvetica-Bold').fontSize(12).text('BALANCE DUE', 300, currentY + 80);
        doc.fillColor(theme.accent).fontSize(14).text(`Rs. ${Math.max(0, balanceDue).toLocaleString()}`, 430, currentY + 79, { width: 125, align: 'right' });

        // TERMS AND CONDITIONS
        currentY += 140;
        doc.rect(40, currentY, 515, 75).fill(theme.light);
        doc.fillColor(theme.primary).fontSize(9).font('Helvetica-Bold').text('TERMS & CONDITIONS', 50, currentY + 12);
        doc.fillColor(theme.muted).font('Helvetica').fontSize(8).text(
            '1. Custom designs require a non-refundable advance payment before production begins.\n' +
            '2. The final balance must be cleared upon completion and delivery of the jewelry.\n' +
            '3. Weight and metal purity are guaranteed as per the final certification.\n' +
            '4. Returns or exchanges are not applicable on personalized bespoke pieces.', 
            50, currentY + 25, { lineGap: 3 }
        );

        // FOOTER
        doc.rect(0, 790, 595, 52).fill(theme.primary);
        doc.fillColor(theme.gold).fontSize(9).font('Helvetica').text('Thank you for choosing our bespoke design services.', 0, 810, { align: 'center', width: 595 });
        
        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to generate PDF' });
    }
};
