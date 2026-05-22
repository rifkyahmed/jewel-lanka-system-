const Order = require('../models/Order');
const Product = require('../models/Product');
const GoldRate = require('../models/GoldRate');
const Customer = require('../models/Customer');
const Repair = require('../models/Repair');
const CustomOrder = require('../models/CustomOrder');
const Cashbook = require('../models/Cashbook');

// Helper to get active rates
const getActiveRates = async () => {
    const rateDoc = await GoldRate.findOne().sort({ createdAt: -1 });
    if (rateDoc) return rateDoc;
    return {
        rates: { gold_24k: 9500, gold_22k: 8700, gold_20k: 7916, gold_18k: 7125 }
    };
};

// Helper to calculate price for a single product
const calculateProductPrice = (product, rates) => {
    let metalRate = 0;
    if (product.metalType === 'gold_24k') metalRate = rates.gold_24k;
    else if (product.metalType === 'gold_22k') metalRate = rates.gold_22k;
    else if (product.metalType === 'gold_20k') metalRate = rates.gold_20k;
    else if (product.metalType === 'gold_18k') metalRate = rates.gold_18k;
    else if (product.metalType === 'silver_925') metalRate = 120;
    else if (product.metalType === 'platinum') metalRate = 3500;

    const metalCost = product.metalWeightGrams * metalRate;
    const makingCharges = (product.makingChargePerGram * product.metalWeightGrams) + product.makingChargeFixed;
    
    let gemsCost = 0;
    if (product.gemstones && product.gemstones.length > 0) {
        gemsCost = product.gemstones.reduce((sum, gem) => sum + (gem.cost || 0), 0);
    }

    return metalCost + makingCharges + gemsCost;
};

// Helper to calculate profit of an order (Decision Analytics Model)
// Profit = (Retail Rate - 90% Wholesale Cost) * Metal Weight + Making Charges + 15% Gem Markup - Discount
const calculateOrderProfit = (order) => {
    let profit = 0;
    if (!order.items) return 0;
    order.items.forEach(item => {
        const metalProfit = (item.metalRateApplied || 0) * 0.1 * (item.metalWeightGrams || 0);
        const makingChargeProfit = item.makingChargeApplied || 0;
        const gemstoneProfit = (item.gemstoneValueApplied || 0) * 0.15;
        profit += metalProfit + makingChargeProfit + gemstoneProfit;
    });
    profit = profit - (order.discountAmount || 0);
    return Math.round(profit);
};

const getEffectiveStockQuantity = (product) => {
    if (product.stockQuantity === 0) return 0;
    if (Number.isFinite(Number(product.stockQuantity))) return Number(product.stockQuantity);
    return product.status === 'Sold' ? 0 : 1;
};

// @desc    Get dashboard metrics and decision analytics
// @route   GET /api/dashboard
// @access  Private
exports.getDashboardData = async (req, res) => {
    try {
        const activeRates = await getActiveRates();
        const rates = activeRates.rates;

        // 1. Showcase Stock Stats (Active Products & Inventory Value)
        const showcaseProducts = await Product.find({ status: 'In_Showcase' });
        const activeProductsCount = showcaseProducts.reduce((sum, p) => sum + getEffectiveStockQuantity(p), 0);
        const totalStockValue = Math.round(showcaseProducts.reduce((sum, p) => sum + (calculateProductPrice(p, rates) * getEffectiveStockQuantity(p)), 0));

        // 2. Customers
        const totalCustomers = await Customer.countDocuments();

        // 3. Time-based sales filters
        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

        // Fetch Orders for metrics
        const allOrders = await Order.find();
        const allCustomOrders = await CustomOrder.find();

        // Calculations
        let totalRevenue = 0;
        let totalOrders = allOrders.length + allCustomOrders.length;
        let thisMonthOrders = 0;
        let thisMonthSales = 0;
        let thisMonthProfits = 0;
        let todaySales = 0;
        let todayProfits = 0;
        let week1Revenue = 0; // last 7 days
        let week2Revenue = 0; // 7-14 days ago

        allOrders.forEach(order => {
            const saleDate = new Date(order.saleDate);
            const profit = calculateOrderProfit(order);
            
            totalRevenue += order.finalAmount;

            if (saleDate >= startOfToday) {
                todaySales += order.finalAmount;
                todayProfits += profit;
            }

            if (saleDate >= startOfMonth) {
                thisMonthOrders++;
                thisMonthSales += order.finalAmount;
                thisMonthProfits += profit;
            }

            if (saleDate >= sevenDaysAgo) {
                week1Revenue += order.finalAmount;
            } else if (saleDate >= fourteenDaysAgo) {
                week2Revenue += order.finalAmount;
            }
        });

        allCustomOrders.forEach(order => {
            const saleDate = new Date(order.updatedAt || order.createdAt);
            const collectedRevenue = order.paymentStatus === 'Paid' ? order.quotedPrice : (order.advancePayment || 0);
            const profit = collectedRevenue * 0.2; // approx 20% profit on collected amount
            
            totalRevenue += collectedRevenue;

            if (saleDate >= startOfToday) {
                todaySales += collectedRevenue;
                todayProfits += profit;
            }

            if (saleDate >= startOfMonth) {
                thisMonthOrders++;
                thisMonthSales += collectedRevenue;
                thisMonthProfits += profit;
            }

            if (saleDate >= sevenDaysAgo) {
                week1Revenue += collectedRevenue;
            } else if (saleDate >= fourteenDaysAgo) {
                week2Revenue += collectedRevenue;
            }
        });

        const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

        // Weekly Growth
        let weeklyGrowth = 0;
        if (week2Revenue > 0) {
            weeklyGrowth = Math.round(((week1Revenue - week2Revenue) / week2Revenue) * 100);
        } else if (week1Revenue > 0) {
            weeklyGrowth = 100;
        }

        // 4. Pending Payments (Unpaid Repairs & Custom Orders)
        const unpaidRepairs = await Repair.find({ status: { $ne: 'Delivered' }, paymentStatus: 'Unpaid' });
        const unpaidCustomOrders = await CustomOrder.find({ status: { $ne: 'Delivered' }, paymentStatus: { $ne: 'Paid' } });
        
        const pendingPayments = unpaidRepairs.reduce((sum, r) => sum + r.estimatedCost, 0) + 
                                unpaidCustomOrders.reduce((sum, c) => sum + (c.quotedPrice - c.advancePayment), 0);

        // Custom Orders count
        const customOrdersCount = await CustomOrder.countDocuments({ status: { $ne: 'Delivered' } });

        // 5. Low Stock Items (categories where showcase products count < 3)
        // Group all showcase products by category
        const categoryCounts = {};
        showcaseProducts.forEach(p => {
            categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
        });
        
        let lowStockCount = 0;
        const lowStockCategoriesList = [];
        Object.keys(categoryCounts).forEach(cat => {
            if (categoryCounts[cat] < 3) {
                lowStockCount += categoryCounts[cat];
                lowStockCategoriesList.push(cat);
            }
        });

        const lowStockProductsList = showcaseProducts
            .filter(p => lowStockCategoriesList.includes(p.category))
            .map(p => ({
                sku: p.sku || p._id,
                name: p.name,
                category: p.category,
                stock: getEffectiveStockQuantity(p)
            }));

        // 6. Dead Stock Calculations
        const deadStockList = showcaseProducts.map(p => {
            const ageDays = Math.floor((now - new Date(p.enteredStockDate)) / (1000 * 60 * 60 * 24));
            const sellingPrice = Math.round(calculateProductPrice(p, rates));
            return {
                sku: p.sku,
                name: p.name,
                category: p.category,
                ageDays,
                metalWeightGrams: p.metalWeightGrams,
                stockQuantity: getEffectiveStockQuantity(p),
                sellingPrice
            };
        }).filter(item => item.ageDays >= 30);

        const deadStockValue = deadStockList.reduce((sum, p) => sum + (p.sellingPrice * (p.stockQuantity ?? 1)), 0);
        const deadStockCount = deadStockList.reduce((sum, p) => sum + (p.stockQuantity ?? 1), 0);

        const severeItems = deadStockList.filter(item => item.ageDays > 60);
        const moderateItems = deadStockList.filter(item => item.ageDays >= 30 && item.ageDays <= 60);

        const deadStockSummary = [];
        if (severeItems.length > 0) {
            deadStockSummary.push({
                _id: 'Severe Aging (>60 Days)',
                items: severeItems
            });
        }
        if (moderateItems.length > 0) {
            deadStockSummary.push({
                _id: 'Moderate Aging (30-60 Days)',
                items: moderateItems
            });
        }

        // 7. Rolling 14-day Daily Sales History
        const rollingSales = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            
            const nextDay = new Date(d);
            nextDay.setDate(nextDay.getDate() + 1);

            const daySales = allOrders.filter(o => {
                const sd = new Date(o.saleDate);
                return sd >= d && sd < nextDay;
            }).reduce((sum, o) => sum + o.finalAmount, 0);

            const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            rollingSales.push({ date: dateStr, revenue: daySales });
        }

        // 15. Yearly Sales by Month (Jan - Dec)
        const currentYear = new Date().getFullYear();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const yearlySales = monthNames.map((m, index) => {
            const sum = allOrders.filter(o => {
                const sd = new Date(o.saleDate);
                return sd.getFullYear() === currentYear && sd.getMonth() === index;
            }).reduce((acc, o) => acc + o.finalAmount, 0);
            return { month: m, revenue: sum };
        });

        // 8. Orders Overview & Recent Orders
        const recentOrders = await Order.find()
            .sort({ saleDate: -1 })
            .limit(5)
            .populate('customerId');

        const ordersOverview = {
            Cash: allOrders.filter(o => o.paymentMethod === 'Cash').length,
            Card: allOrders.filter(o => o.paymentMethod === 'Card').length,
            BankTransfer: allOrders.filter(o => o.paymentMethod === 'BankTransfer').length,
        };

        // 9. Top Selling Categories
        const categorySalesVelocity = await Order.aggregate([
            { $unwind: '$items' },
            { 
                $group: { 
                    _id: '$items.category', 
                    totalSold: { $sum: 1 }, 
                    totalRevenue: { $sum: '$items.subtotal' } 
                } 
            },
            { $sort: { totalSold: -1 } }
        ]);

        // 10. Top Products (By quantity sold)
        const topProducts = await Order.aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.sku',
                    name: { $first: '$items.name' },
                    category: { $first: '$items.category' },
                    totalSold: { $sum: 1 },
                    totalRevenue: { $sum: '$items.subtotal' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);

        // 11. Sales by Day of Week
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const salesByDay = daysOfWeek.map((dayName, index) => {
            const sum = allOrders.filter(o => new Date(o.saleDate).getDay() === index)
                .reduce((sum, o) => sum + o.finalAmount, 0);
            return { day: dayName, revenue: sum };
        });

        // 12. Customer Retention Rate
        const customersWithOrders = await Order.distinct('customerId');
        let repeatCustomersCount = 0;
        if (customersWithOrders.length > 0) {
            const customerOrderCounts = await Order.aggregate([
                { $group: { _id: '$customerId', count: { $sum: 1 } } },
                { $match: { count: { $gt: 1 }, _id: { $ne: null } } }
            ]);
            repeatCustomersCount = customerOrderCounts.length;
        }
        const retentionRate = customersWithOrders.length > 0 
            ? Math.round((repeatCustomersCount / customersWithOrders.filter(Boolean).length) * 100)
            : 0;

        // Customer Value Report (VIP Customers)
        const customerValueReport = await Order.aggregate([
            { $match: { customerId: { $ne: null } } },
            {
                $group: {
                    _id: '$customerId',
                    totalSpent: { $sum: '$finalAmount' },
                    ordersCount: { $sum: 1 }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'customers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customerDetails'
                }
            },
            { $unwind: '$customerDetails' },
            {
                $project: {
                    name: '$customerDetails.name',
                    phone: '$customerDetails.phone',
                    totalSpent: 1,
                    ordersCount: 1
                }
            }
        ]);

        // 13. Attention Needed Flags
        const attentionNeeded = {
            severeDeadStockCount: severeItems.length,
            overdueRepairsCount: await Repair.countDocuments({
                status: { $in: ['Received', 'In_Progress'] },
                receivedDate: { $lt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
            }),
            lowStockCategoriesCount: lowStockCategoriesList.length
        };

        // 14. Upcoming Birthdays (Current month birthdays)
        const currentMonthNum = new Date().getMonth() + 1;
        const allCustomers = await Customer.find();
        const upcomingBirthdays = allCustomers.filter(c => {
            if (!c.birthday) return false;
            const bMonth = new Date(c.birthday).getMonth() + 1;
            return bMonth === currentMonthNum;
        }).map(c => ({
            name: c.name,
            phone: c.phone,
            birthday: c.birthday
        }));

        res.json({
            activeRates,
            kpis: {
                totalRevenue,
                totalOrders,
                thisMonthOrders,
                thisMonthSales,
                thisMonthProfits,
                todaySales,
                todayProfits,
                activeProducts: activeProductsCount,
                totalCustomers,
                inventoryValue: totalStockValue,
                todayProfit: todayProfits,
                avgOrderValue,
                pendingPayments,
                lowStockItems: lowStockCount,
                deadStockCount,
                deadStockValue,
                customOrders: customOrdersCount,
                weeklyGrowth
            },
            rollingSales,
            categorySalesVelocity,
            deadStockSummary,
            customerValueReport,
            upcomingBirthdays,
            recentOrders,
            ordersOverview,
            topProducts,
            salesByDay,
            retention: retentionRate,
            attentionNeeded,
            yearlySales,
            lowStockProducts: lowStockProductsList
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
