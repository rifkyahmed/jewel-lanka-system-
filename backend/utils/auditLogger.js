const AuditLog = require('../models/AuditLog');

const snapshot = (value) => {
    if (!value) return null;
    if (typeof value.toObject === 'function') return value.toObject();
    return value;
};

const logAudit = async ({ req, action, entityType, entityId, beforeState, afterState, metadata }) => {
    try {
        if (!req?.user) return;
        await AuditLog.create({
            actorId: req.user._id,
            actorName: req.user.name,
            actorRole: req.user.role,
            action,
            entityType,
            entityId,
            beforeState: snapshot(beforeState),
            afterState: snapshot(afterState),
            metadata: metadata || undefined
        });
    } catch (error) {
        console.error('Audit log write failed:', error.message);
    }
};

module.exports = { logAudit };