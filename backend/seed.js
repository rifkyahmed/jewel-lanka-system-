const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const User = require('./models/User');
const GoldRate = require('./models/GoldRate');
const Product = require('./models/Product');
const Customer = require('./models/Customer');
const Supplier = require('./models/Supplier');
const Order = require('./models/Order');
const Repair = require('./models/Repair');
const Cashbook = require('./models/Cashbook');

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/jewelry_jms');
        console.log('MongoDB Connected for seeding...');

        // Clear existing data
        await User.deleteMany({});
        await GoldRate.deleteMany({});
        await Product.deleteMany({});
        await Customer.deleteMany({});
        await Supplier.deleteMany({});
        await Order.deleteMany({});
        await Repair.deleteMany({});
        await Cashbook.deleteMany({});
        console.log('Cleared all collections...');

        // 1. Seed Users
        const users = await User.create([
            {
                username: 'admin',
                password: 'admin123',
                fullName: 'M.R. Wickremasinghe (Owner)',
                role: 'Admin'
            },
            {
                username: 'cashier',
                password: 'cashier123',
                fullName: 'A. Perera (Cashier)',
                role: 'Cashier'
            }
        ]);
        console.log('Seeded Users...');
        const adminId = users[0]._id;

        // 2. Seed Gold Rates (fluctuating history over past 4 days)
        const rateHistory = [
            { rates: { gold_24k: 9200, gold_22k: 8433, gold_20k: 7666, gold_18k: 6900 }, updatedBy: adminId, createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
            { rates: { gold_24k: 9350, gold_22k: 8571, gold_20k: 7791, gold_18k: 7012 }, updatedBy: adminId, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
            { rates: { gold_24k: 9400, gold_22k: 8617, gold_20k: 7833, gold_18k: 7050 }, updatedBy: adminId, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
            { rates: { gold_24k: 9500, gold_22k: 8709, gold_20k: 7916, gold_18k: 7125 }, updatedBy: adminId, createdAt: new Date() }
        ];
        await GoldRate.create(rateHistory);
        console.log('Seeded Gold Rates...');

        // 3. Seed Suppliers
        const suppliers = await Supplier.create([
            {
                name: 'Lanka Gold Wholesalers',
                contactPerson: 'S. Rajaratnam',
                phone: '0771234567',
                email: 'raj@lankagold.lk',
                address: 'Sea Street, Colombo 11',
                metalTypeSupplied: ['Gold'],
                outstandingBalance: 1200000
            },
            {
                name: 'Rathnapura Gem Importers',
                contactPerson: 'K. Jayasinghe',
                phone: '0719876543',
                email: 'gems@rathnapura.lk',
                address: 'Main Street, Ratnapura',
                metalTypeSupplied: ['Gemstones', 'Diamonds'],
                outstandingBalance: 450000
            }
        ]);
        console.log('Seeded Suppliers...');

        // 4. Seed Customers
        const customers = await Customer.create([
            {
                name: 'Anula Senanayake',
                phone: '0779876543',
                email: 'anula.s@gmail.com',
                address: 'Flower Road, Colombo 7',
                birthday: '1975-06-15',
                notes: 'Prefers 22k traditional designs'
            },
            {
                name: 'Dineth Wijesinghe',
                phone: '0714567890',
                email: 'dineth.w@hotmail.com',
                address: 'Galle Road, Mount Lavinia',
                birthday: '1990-11-20',
                notes: 'Diamond ring purchase lead'
            },
            {
                name: 'Nirmala Fernando',
                phone: '0722233445',
                email: 'nfernando@outlook.com',
                address: 'Kandy Road, Kelaniya',
                birthday: '1982-03-08',
                notes: 'VIP Customer'
            }
        ]);
        console.log('Seeded Customers...');

        // 5. Seed Products (Inventory)
        const products = await Product.create([
            {
                sku: 'RNG-001',
                name: 'Classic 22K Bangle Ring',
                category: 'Ring',
                metalType: 'gold_22k',
                metalWeightGrams: 8.5,
                makingChargePerGram: 250,
                makingChargeFixed: 1500,
                gemstones: [],
                status: 'In_Showcase',
                supplierId: suppliers[0]._id,
                enteredStockDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
            },
            {
                sku: 'NEC-002',
                name: 'Royal Peacock Necklace (Ruby)',
                category: 'Necklace',
                metalType: 'gold_22k',
                metalWeightGrams: 32.4,
                makingChargePerGram: 300,
                makingChargeFixed: 5000,
                gemstones: [
                    { gemType: 'Ruby', carats: 4.5, cut: 'Oval', clarity: 'VVS2', cost: 120000 }
                ],
                status: 'In_Showcase',
                supplierId: suppliers[0]._id,
                enteredStockDate: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000)
            },
            {
                sku: 'RNG-003',
                name: 'Solitaire Diamond Engagement Ring',
                category: 'Ring',
                metalType: 'gold_18k',
                metalWeightGrams: 4.2,
                makingChargePerGram: 400,
                makingChargeFixed: 3500,
                gemstones: [
                    { gemType: 'Diamond', carats: 0.75, cut: 'Brilliant', clarity: 'VVS1', cost: 250000 }
                ],
                status: 'In_Showcase',
                supplierId: suppliers[1]._id,
                enteredStockDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            },
            {
                sku: 'EAR-004',
                name: '22K Gold Filigree Jhumkas',
                category: 'Earring',
                metalType: 'gold_22k',
                metalWeightGrams: 14.8,
                makingChargePerGram: 220,
                makingChargeFixed: 2000,
                gemstones: [],
                status: 'In_Showcase',
                supplierId: suppliers[0]._id,
                enteredStockDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
            },
            {
                sku: 'RNG-005',
                name: 'Simple Gold Band 24K',
                category: 'Ring',
                metalType: 'gold_24k',
                metalWeightGrams: 6.0,
                makingChargePerGram: 150,
                makingChargeFixed: 1000,
                gemstones: [],
                status: 'Sold',
                supplierId: suppliers[0]._id,
                enteredStockDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
            },
            {
                sku: 'BRC-006',
                name: 'Emerald Tennis Bracelet',
                category: 'Bracelet',
                metalType: 'gold_18k',
                metalWeightGrams: 18.5,
                makingChargePerGram: 350,
                makingChargeFixed: 4000,
                gemstones: [
                    { gemType: 'Emerald', carats: 5.2, cut: 'Emerald', clarity: 'VS1', cost: 180000 }
                ],
                status: 'Sold',
                supplierId: suppliers[1]._id,
                enteredStockDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
            }
        ]);
        console.log('Seeded Products...');

        // 6. Seed Orders (Historical Transactions)
        const orderRates = { gold_24k: 9400, gold_22k: 8617, gold_18k: 7050 };

        const order1 = await Order.create({
            invoiceNumber: 'INV-784012',
            saleDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            customerId: customers[0]._id,
            salesRepId: adminId,
            items: [{
                sku: 'RNG-005',
                name: 'Simple Gold Band 24K',
                category: 'Ring',
                metalType: 'gold_24k',
                metalWeightGrams: 6.0,
                metalRateApplied: orderRates.gold_24k,
                makingChargeApplied: 1900,
                gemstoneValueApplied: 0,
                subtotal: (6.0 * orderRates.gold_24k) + 1900
            }],
            finalAmount: (6.0 * orderRates.gold_24k) + 1900 - 1500,
            discountAmount: 1500,
            paymentMethod: 'Cash'
        });

        const order2 = await Order.create({
            invoiceNumber: 'INV-784013',
            saleDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            customerId: customers[2]._id,
            salesRepId: adminId,
            items: [{
                sku: 'BRC-006',
                name: 'Emerald Tennis Bracelet',
                category: 'Bracelet',
                metalType: 'gold_18k',
                metalWeightGrams: 18.5,
                metalRateApplied: orderRates.gold_18k,
                makingChargeApplied: (350 * 18.5) + 4000,
                gemstoneValueApplied: 180000,
                subtotal: Math.round((18.5 * orderRates.gold_18k) + (350 * 18.5) + 4000 + 180000)
            }],
            finalAmount: Math.round((18.5 * orderRates.gold_18k) + (350 * 18.5) + 4000 + 180000),
            paymentMethod: 'Card'
        });
        console.log('Seeded Orders...');

        // 7. Seed Repairs
        const repair1 = await Repair.create({
            repairNumber: 'REP-001402',
            customerId: customers[0]._id,
            itemName: 'Gold Chain (Broken Hook)',
            description: 'Solder broken hook clasp and polish entire chain',
            estimatedWeight: 12.5,
            estimatedCost: 3500,
            status: 'Delivered',
            paymentStatus: 'Paid',
            receivedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            completedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        });

        const repair2 = await Repair.create({
            repairNumber: 'REP-001403',
            customerId: customers[1]._id,
            itemName: 'Diamond Ring Resizing',
            description: 'Downsize platinum diamond ring from size P to M',
            estimatedWeight: 5.4,
            estimatedCost: 6000,
            status: 'In_Progress',
            paymentStatus: 'Unpaid',
            receivedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        });
        console.log('Seeded Repairs...');

        // 8. Seed Cashbook Ledger Entries
        await Cashbook.create([
            {
                type: 'Income',
                category: 'Sale',
                amount: order1.finalAmount,
                description: `Sales Invoice settlement: INV-784012`,
                paymentMethod: 'Cash',
                referenceId: order1._id,
                entryDate: order1.saleDate
            },
            {
                type: 'Income',
                category: 'Sale',
                amount: order2.finalAmount,
                description: `Sales Invoice settlement: INV-784013`,
                paymentMethod: 'Card',
                referenceId: order2._id,
                entryDate: order2.saleDate
            },
            {
                type: 'Income',
                category: 'Repair',
                amount: 3500,
                description: `Repair Settlement: REP-001402 - Gold Chain (Broken Hook)`,
                paymentMethod: 'Cash',
                referenceId: repair1._id,
                entryDate: repair1.completedDate
            },
            {
                type: 'Expense',
                category: 'Salary',
                amount: 75000,
                description: 'Monthly salary payout for Sales Staff',
                paymentMethod: 'BankTransfer',
                entryDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
            },
            {
                type: 'Expense',
                category: 'Rent',
                amount: 150000,
                description: 'Showroom showroom lease fee Colombo 07',
                paymentMethod: 'BankTransfer',
                entryDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000)
            }
        ]);
        console.log('Seeded Cashbook entries...');

        console.log('Database Seeding Successful!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding Failed:', error);
        process.exit(1);
    }
};

seedDB();
