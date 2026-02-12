import express from 'express';
import { query, validationResult } from 'express-validator';
import Showroom from '../models/Showroom.js';
import Vehicle from '../models/Vehicle.js';
import Transaction from '../models/Transaction.js';
import CarAccount from '../models/CarAccount.js';
import User from '../models/User.js';
import { protect, restrictToShowroom } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.use(protect);
router.use(restrictToShowroom);

router.get(
  '/dashboard',
  query('showroomId').optional().isMongoId(),
  asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const isAdmin = req.user.role === 'admin';
      const showroomFilter = isAdmin && req.query.showroomId
        ? { _id: req.query.showroomId }
        : isAdmin
          ? {}
          : { _id: req.showroomId };
      const showrooms = await Showroom.find(showroomFilter).lean();
      const showroomIds = showrooms.map((s) => s._id);

      const [vehicleCount, availableCount, soldCount, transactionCount, saleCount, userCount, pdfCountResult] = await Promise.all([
        Vehicle.countDocuments({ showroom: { $in: showroomIds } }),
        Vehicle.countDocuments({ showroom: { $in: showroomIds }, status: 'available' }),
        Vehicle.countDocuments({ showroom: { $in: showroomIds }, status: 'sold' }),
        Transaction.countDocuments({ showroom: { $in: showroomIds } }),
        Transaction.countDocuments({ showroom: { $in: showroomIds }, type: 'sale' }),
        isAdmin ? User.countDocuments({ role: 'user' }) : Promise.resolve(0),
        Transaction.aggregate([{ $match: { showroom: { $in: showroomIds } } }, { $group: { _id: null, total: { $sum: '$pdfCount' } } }]).then((r) => (r[0]?.total ?? 0)),
      ]);

      const recentTransactions = await Transaction.find({ showroom: { $in: showroomIds } })
        .sort({ transactionDate: -1, createdAt: -1 })
        .limit(10)
        .populate({ path: 'carAccount', select: 'purchaserName', populate: { path: 'vehicle', select: 'chassisNo make model' } })
        .populate('showroom', 'name')
        .lean();

      const revenueResult = await Transaction.aggregate([
        { $match: { showroom: { $in: showroomIds }, type: 'sale' } },
        { $addFields: { commissionAmountPkr: { $multiply: ['$amount', { $divide: [{ $ifNull: ['$commission', 0] }, 100] }] } } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalCommission: { $sum: '$commissionAmountPkr' } } },
      ]);
      const totalRevenue = revenueResult[0]?.totalRevenue ?? 0;
      const totalCommission = revenueResult[0]?.totalCommission ?? 0;

      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [dailyCommission, weeklyCommission, monthlyCommission] = await Promise.all([
        Transaction.aggregate([
          { $match: { showroom: { $in: showroomIds }, type: 'sale', transactionDate: { $gte: dayAgo } } },
          { $addFields: { commissionAmountPkr: { $multiply: ['$amount', { $divide: [{ $ifNull: ['$commission', 0] }, 100] }] } } },
          { $group: { _id: null, sum: { $sum: '$commissionAmountPkr' } } },
        ]).then((r) => r[0]?.sum ?? 0),
        Transaction.aggregate([
          { $match: { showroom: { $in: showroomIds }, type: 'sale', transactionDate: { $gte: weekAgo } } },
          { $addFields: { commissionAmountPkr: { $multiply: ['$amount', { $divide: [{ $ifNull: ['$commission', 0] }, 100] }] } } },
          { $group: { _id: null, sum: { $sum: '$commissionAmountPkr' } } },
        ]).then((r) => r[0]?.sum ?? 0),
        Transaction.aggregate([
          { $match: { showroom: { $in: showroomIds }, type: 'sale', transactionDate: { $gte: monthAgo } } },
          { $addFields: { commissionAmountPkr: { $multiply: ['$amount', { $divide: [{ $ifNull: ['$commission', 0] }, 100] }] } } },
          { $group: { _id: null, sum: { $sum: '$commissionAmountPkr' } } },
        ]).then((r) => r[0]?.sum ?? 0),
      ]);

      const paymentDistributionRaw = await CarAccount.aggregate([
        { $match: { showroom: { $in: showroomIds } } },
        { $unwind: { path: '$paymentMethods', preserveNullAndEmptyArrays: true } },
        { $group: { _id: { $ifNull: ['$paymentMethods.method', 'cash'] }, total: { $sum: { $ifNull: ['$paymentMethods.amount', 0] } } } },
      ]);
      const paymentDistribution = paymentDistributionRaw.map((p) => ({ method: p._id || 'cash', total: p.total })).filter((p) => p.total > 0);

      res.json({
        showrooms: isAdmin ? showrooms : showrooms.map((s) => ({ _id: s._id, name: s.name, address: s.address, phone: s.phone })),
        counts: {
          showrooms: showrooms.length,
          vehicles: vehicleCount,
          available: availableCount,
          sold: soldCount,
          transactions: transactionCount,
          sales: saleCount,
          users: userCount,
          pdfCount: pdfCountResult,
          totalRevenue,
          totalCommission,
        },
        revenue: {
          total: totalRevenue,
          daily: dailyCommission,
          weekly: weeklyCommission,
          monthly: monthlyCommission,
          paymentDistribution,
        },
        recentTransactions,
      });
  })
);

export default router;
