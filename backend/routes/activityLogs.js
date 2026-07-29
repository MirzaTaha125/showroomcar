import express from 'express';
import { query, validationResult } from 'express-validator';
import ActivityLog from '../models/ActivityLog.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get(
  '/',
  query('showroomId').optional().isMongoId(),
  query('action').optional().trim(),
  query('userId').optional().isMongoId(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const filter = {};
    if (req.query.showroomId) filter.showroom = req.query.showroomId;
    if (req.query.action) filter.action = req.query.action;
    if (req.query.userId) filter.user = req.query.userId;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) {
        const toDate = new Date(req.query.to);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }
    const logs = await ActivityLog.find(filter)
      .populate('user', 'name email role')
      .populate('showroom', 'name')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json(logs);
  })
);

/** Delete all activity logs (admin only). */
router.delete(
  '/',
  asyncHandler(async (req, res) => {
    const result = await ActivityLog.deleteMany({});
    res.json({ message: 'All activity logs have been deleted.', deletedCount: result.deletedCount });
  })
);

export default router;
