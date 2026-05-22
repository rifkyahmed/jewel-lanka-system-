const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Vercel Fallbacks (in case env variables were missed during setup)
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://norcosgaming_db_user:JewelLanka123@cluster0.bw5ss5o.mongodb.net/jewelry_jms?appName=Cluster0';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'haralusso_jewel_secret_key_998877';
process.env.NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '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';

// Connect to MongoDB Database (skip during tests)
if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes mapping
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/rates', require('./routes/rateRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/repairs', require('./routes/repairRoutes'));
app.use('/api/custom-orders', require('./routes/customOrderRoutes'));
app.use('/api/cashbook', require('./routes/cashbookRoutes'));
app.use('/api/audit-logs', require('./routes/auditLogRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
// app.use('/api/ai', require('./routes/aiRoutes'));

// Basic health check route
app.get('/', (req, res) => {
    res.send('Decision Analytics Jewelry JMS API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'production' ? {} : err
    });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
}

module.exports = app;
