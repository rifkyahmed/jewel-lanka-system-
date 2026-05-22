const AuditLog = require('../models/AuditLog');

exports.getAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find()
            .populate('actorId', 'name username role')
            .sort({ createdAt: -1 })
            .limit(200);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};