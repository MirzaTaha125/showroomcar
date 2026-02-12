import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Transaction from '../models/Transaction.js';
import { protect, restrictToShowroom } from '../middleware/auth.js';
import { logActivity } from '../utils/activityLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.use(protect);
router.use(restrictToShowroom);

function getNextReceiptNumber() {
  return `RCP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

router.get(
  '/',
  query('showroomId').optional().isMongoId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const filter = {};
    if (req.user.role === 'admin') {
      if (req.query.showroomId) filter.showroom = req.query.showroomId;
    } else {
      filter.showroom = req.showroomId;
    }
    const transactions = await Transaction.find(filter)
      .populate('showroom', 'name address phone ownerName')
      .populate({ path: 'carAccount', populate: { path: 'vehicle', select: 'registrationNo chassisNo engineNo make model' } })
      .populate('createdBy', 'name email')
      .sort({ transactionDate: -1, createdAt: -1 });
    res.json(transactions);
  })
);

router.get(
  '/:id',
  param('id').isMongoId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const transaction = await Transaction.findById(req.params.id)
      .populate('showroom', 'name address phone ownerName')
      .populate({ path: 'carAccount', populate: { path: 'vehicle', select: 'registrationNo chassisNo engineNo make model' } })
      .populate('createdBy', 'name email');
    if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
    const showroomId = transaction.showroom?._id?.toString?.() || transaction.showroom?.toString?.();
    if (req.user.role !== 'admin' && showroomId !== req.showroomId) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    res.json(transaction);
  })
);

router.post(
  '/',
  [
    body('type').isIn(['sale', 'purchase']).withMessage('Type must be sale or purchase'),
    body('showroom').optional().isMongoId(),
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
    body('commission').optional().isFloat({ min: 0, max: 100 }),
    body('make').optional().trim(),
    body('model').optional().trim(),
    body('chassisNo').optional().trim(),
    body('engineNo').optional().trim(),
    body('transactionDate').optional().isISO8601(),
  ],
  asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      if (req.body.type === 'sale') {
        return res.status(400).json({ message: 'Use POST /api/car-accounts to create a sale (car account).' });
      }
      const showroomId = req.body.showroom || (req.user.role === 'admin' ? null : req.showroomId);
      if (!showroomId) return res.status(400).json({ message: 'Showroom is required.' });
      if (req.user.role !== 'admin' && showroomId !== req.showroomId) {
        return res.status(403).json({ message: 'Access denied.' });
      }
      const transaction = await Transaction.create({
        showroom: showroomId,
        type: 'purchase',
        amount: req.body.amount,
        commission: req.body.commission ?? 0,
        make: req.body.make || '',
        model: req.body.model || '',
        chassisNo: req.body.chassisNo || '',
        engineNo: req.body.engineNo || '',
        transactionDate: req.body.transactionDate ? new Date(req.body.transactionDate) : new Date(),
        createdBy: req.user._id,
      });
      await logActivity({
        userId: req.user._id,
        action: 'transaction_create',
        entityType: 'transaction',
        entityId: transaction._id,
        showroomId: transaction.showroom,
        metadata: { type: 'purchase' },
      });
      const t = await Transaction.findById(transaction._id)
        .populate('showroom', 'name address phone ownerName')
        .populate('carAccount')
        .populate('createdBy', 'name email');
    res.status(201).json(t);
  })
);

router.put(
  '/:id',
  [
    param('id').isMongoId(),
    body('amount').optional().isFloat({ min: 0 }),
    body('commission').optional().isFloat({ min: 0, max: 100 }),
    body('make').optional().trim(),
    body('model').optional().trim(),
    body('chassisNo').optional().trim(),
    body('engineNo').optional().trim(),
    body('transactionDate').optional({ nullable: true, checkFalsy: true }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
    const showroomId = transaction.showroom?.toString?.();
    if (req.user.role !== 'admin' && showroomId !== req.showroomId) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const allowed = ['amount', 'commission', 'make', 'model', 'chassisNo', 'engineNo', 'transactionDate'];
    allowed.forEach((key) => { if (req.body[key] !== undefined) transaction[key] = req.body[key]; });
    if (req.body.transactionDate !== undefined && req.body.transactionDate) {
      transaction.transactionDate = new Date(req.body.transactionDate);
    }
    await transaction.save();
    const t = await Transaction.findById(transaction._id)
      .populate('showroom', 'name address phone ownerName')
      .populate('carAccount')
      .populate('createdBy', 'name email');
    res.json(t);
  })
);

router.delete(
  '/:id',
  param('id').isMongoId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const transaction = await Transaction.findById(req.params.id).populate('carAccount');
    if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
    const showroomId = transaction.showroom?.toString?.();
    if (req.user.role !== 'admin' && showroomId !== req.showroomId) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const carAccountId = transaction.carAccount?._id ?? transaction.carAccount;
    if (carAccountId) {
      const CarAccount = (await import('../models/CarAccount.js')).default;
      const carAccount = await CarAccount.findById(carAccountId).populate('vehicle');
      if (carAccount?.vehicle) {
        carAccount.vehicle.status = 'available';
        await carAccount.vehicle.save();
      }
      await CarAccount.findByIdAndDelete(carAccountId);
    }
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ message: 'Transaction deleted.' });
  })
);

export default router;
