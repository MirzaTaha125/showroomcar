import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import TokenReceipt from '../models/TokenReceipt.js';
import { protect, restrictToShowroom } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logActivity } from '../utils/activityLog.js';
import { generateExcel } from '../utils/excel.js';

const router = express.Router();

router.use(protect);
router.use(restrictToShowroom);

const getFilter = (req) => {
    const filter = {};
    if (req.user.role === 'admin') {
        if (req.query.showroomId) filter.showroom = req.query.showroomId;
    } else {
        filter.showroom = req.showroomId;
    }

    if (req.query.createdBy) filter.createdBy = req.query.createdBy;

    if (req.query.dateFrom || req.query.dateTo) {
        filter.createdAt = {};
        if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
        if (req.query.dateTo) {
            const endOfDay = new Date(req.query.dateTo);
            endOfDay.setHours(23, 59, 59, 999);
            filter.createdAt.$lte = endOfDay;
        }
    }
    return filter;
};

router.get(
    '/',
    [
        query('showroomId').optional().isMongoId(),
        query('createdBy').optional().isMongoId(),
        query('dateFrom').optional().isISO8601(),
        query('dateTo').optional().isISO8601(),
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const filter = getFilter(req);

        const receipts = await TokenReceipt.find(filter)
            .populate('showroom', 'name address phone logoPath')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .lean();
        res.json(receipts);
    })
);

router.get(
    '/export',
    [
        query('showroomId').optional().isMongoId(),
        query('createdBy').optional().isMongoId(),
        query('dateFrom').optional().isISO8601(),
        query('dateTo').optional().isISO8601(),
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const filter = getFilter(req);

        const receipts = await TokenReceipt.find(filter)
            .populate('showroom', 'name')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .lean();

        const columns = [
            { header: 'Date', key: 'date', width: 12 },
            { header: 'Receipt No', key: 'receiptNo', width: 15 },
            { header: 'Vehicle', key: 'vehicle', width: 20 },
            { header: 'Model', key: 'model', width: 10 },
            { header: 'Year', key: 'year', width: 10 },
            { header: 'Color', key: 'color', width: 10 },
            { header: 'Registration No', key: 'regNo', width: 15 },
            { header: 'Chassis No', key: 'chassis', width: 20 },
            { header: 'Received From', key: 'from', width: 20 },
            { header: 'Father Name', key: 'fatherName', width: 20 },
            { header: 'Total Price', key: 'totalPrice', width: 15 },
            { header: 'Amount Received', key: 'amountReceived', width: 15 },
            { header: 'Remaining Balance', key: 'remaining', width: 15 },
            { header: 'Purchaser Name', key: 'purchaser', width: 20 },
            { header: 'Purchaser Father Name', key: 'purchaserFatherName', width: 20 },
            { header: 'Purchaser CNIC', key: 'purchaserCnic', width: 20 },
            { header: 'Purchaser Mobile', key: 'purchaserMobile', width: 15 },
            { header: 'Purchaser Address', key: 'purchaserAddress', width: 30 },
            { header: 'Seller Name', key: 'sellerName', width: 20 },
            { header: 'Seller Father Name', key: 'sellerFatherName', width: 20 },
            { header: 'Seller CNIC', key: 'sellerCnic', width: 20 },
            { header: 'Seller Mobile', key: 'sellerMobile', width: 15 },
            { header: 'Seller Address', key: 'sellerAddress', width: 30 },
            { header: 'Created By', key: 'createdBy', width: 15 },
            { header: 'Note', key: 'note', width: 30 },
        ];

        const rows = receipts.map(r => ({
            date: new Date(r.createdAt).toLocaleDateString('en-GB'),
            receiptNo: r.receiptNumber || '-',
            vehicle: `${r.make} ${r.model}`,
            model: r.model,
            year: r.yearOfManufacture || '-',
            color: r.colour || '-',
            regNo: r.registrationNo || '-',
            chassis: r.onBehalfOfSellingCar,
            from: r.fromMrMrs,
            fatherName: r.fatherName || '-',
            totalPrice: r.totalPrice,
            amountReceived: r.amountReceived,
            remaining: r.remainingBalance,
            purchaser: r.purchaserName,
            purchaserFatherName: r.purchaserFatherName || '-',
            purchaserCnic: r.purchaserCnic || '-',
            purchaserMobile: r.purchaserMobile || '-',
            purchaserAddress: r.purchaserAddress || '-',
            sellerName: r.sellerName || '-',
            sellerFatherName: r.sellerFatherName || '-',
            sellerCnic: r.sellerCnic || '-',
            sellerMobile: r.sellerMobile || '-',
            sellerAddress: r.sellerAddress || '-',
            createdBy: r.createdBy?.name || 'Deleted User',
            note: r.note || '-'
        }));

        const buffer = await generateExcel('Token Receipts', columns, rows);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=token_receipts.xlsx');
        res.send(buffer);
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
            .populate('createdBy', 'name email')
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
    body('purchaserFatherName').optional().trim(),
    body('purchaserCnic').optional().trim(),
    body('purchaserMobile').optional().trim(),
    body('purchaserAddress').optional().trim(),
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
            createdBy: req.user._id,
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
            .populate('createdBy', 'name email');
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
            .populate('createdBy', 'name email');
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
