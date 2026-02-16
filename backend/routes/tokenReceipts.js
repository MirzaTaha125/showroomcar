import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import TokenReceipt from '../models/TokenReceipt.js';
import { protect, restrictToShowroom } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logActivity } from '../utils/activityLog.js';

const router = express.Router();

router.use(protect);
router.use(restrictToShowroom);

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

        const receipts = await TokenReceipt.find(filter)
            .populate('showroom', 'name address phone logoPath')
            .populate('addedBy', 'name email')
            .sort({ createdAt: -1 })
            .lean();
        res.json(receipts);
    })
);

router.get(
    '/:id',
    param('id').isMongoId(),
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const receipt = await TokenReceipt.findById(req.params.id)
            .populate('showroom', 'name address phone logoPath')
            .populate('addedBy', 'name email')
            .lean();

        if (!receipt) return res.status(404).json({ message: 'Token receipt not found.' });

        const receiptShowroomId = receipt.showroom?._id?.toString?.() || receipt.showroom?.toString?.();
        if (req.user.role !== 'admin' && receiptShowroomId !== req.showroomId) {
            return res.status(403).json({ message: 'Access denied.' });
        }

        res.json(receipt);
    })
);

const receiptFields = [
    body('amountReceived').isNumeric().withMessage('Amount received is required'),
    body('fromMrMrs').trim().notEmpty().withMessage('Received from is required'),
    body('fatherName').optional().trim(),
    body('onBehalfOfSellingCar').trim().notEmpty().withMessage('Car Chassis No is required'),
    body('make').trim().notEmpty().withMessage('Make is required'),
    body('model').trim().notEmpty().withMessage('Model is required'),
    body('registrationNo').optional().trim(),
    body('yearOfManufacture').optional().trim(),
    body('colour').optional().trim(),
    body('totalPrice').isNumeric().withMessage('Total price is required'),
    body('remainingBalance').isNumeric().withMessage('Remaining balance is required'),
    body('note').optional().trim(),
    body('purchaserName').trim().notEmpty().withMessage('Purchaser name is required'),
    body('purchaserCnic').optional().trim(),
    body('purchaserMobile').optional().trim(),
    body('sellerName').trim().notEmpty().withMessage('Seller name is required'),
    body('sellerFatherName').optional().trim(),
    body('sellerCnic').optional().trim(),
    body('sellerMobile').optional().trim(),
    body('sellerAddress').optional().trim(),
    body('showroom').optional().isMongoId(),
];

router.post(
    '/',
    [...receiptFields],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const showroomId = req.user.role === 'admin' ? req.body.showroom : req.showroomId;
        if (!showroomId) return res.status(400).json({ message: 'Showroom is required.' });

        const receipt = await TokenReceipt.create({
            ...req.body,
            showroom: showroomId,
            addedBy: req.user._id,
        });

        await logActivity({
            userId: req.user._id,
            action: 'token_receipt_create',
            entityType: 'tokenReceipt',
            entityId: receipt._id,
            showroomId,
            metadata: { from: receipt.fromMrMrs, amount: receipt.amountReceived, chassisNo: receipt.onBehalfOfSellingCar },
        });

        const r = await TokenReceipt.findById(receipt._id)
            .populate('showroom', 'name address phone logoPath')
            .populate('addedBy', 'name email');
        res.status(201).json(r);
    })
);

router.put(
    '/:id',
    [
        param('id').isMongoId(),
        ...receiptFields,
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const receipt = await TokenReceipt.findById(req.params.id);
        if (!receipt) return res.status(404).json({ message: 'Token receipt not found.' });

        const showroomId = receipt.showroom?.toString?.();
        if (req.user.role !== 'admin' && showroomId !== req.showroomId) {
            return res.status(403).json({ message: 'Access denied.' });
        }

        Object.assign(receipt, req.body);
        await receipt.save();

        await logActivity({
            userId: req.user._id,
            action: 'token_receipt_update',
            entityType: 'tokenReceipt',
            entityId: receipt._id,
            showroomId,
            metadata: { from: receipt.fromMrMrs, amount: receipt.amountReceived, chassisNo: receipt.onBehalfOfSellingCar },
        });

        const r = await TokenReceipt.findById(receipt._id)
            .populate('showroom', 'name address phone logoPath')
            .populate('addedBy', 'name email');
        res.json(r);
    })
);

router.delete(
    '/:id',
    param('id').isMongoId(),
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const receipt = await TokenReceipt.findById(req.params.id);
        if (!receipt) return res.status(404).json({ message: 'Token receipt not found.' });

        const showroomId = receipt.showroom?.toString?.();
        if (req.user.role !== 'admin' && showroomId !== req.showroomId) {
            return res.status(403).json({ message: 'Access denied.' });
        }

        await logActivity({
            userId: req.user._id,
            action: 'token_receipt_delete',
            entityType: 'tokenReceipt',
            entityId: receipt._id,
            showroomId,
            metadata: { from: receipt.fromMrMrs, amount: receipt.amountReceived, chassisNo: receipt.onBehalfOfSellingCar },
        });

        await TokenReceipt.findByIdAndDelete(req.params.id);
        res.json({ message: 'Token receipt deleted.' });
    })
);

export default router;
