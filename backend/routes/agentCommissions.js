import express from 'express';
import { query, param, validationResult } from 'express-validator';
import AgentCommission from '../models/AgentCommission.js';
import { protect, restrictToShowroom } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
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

    if (req.query.userId) filter.user = req.query.userId;
    if (req.query.status) filter.status = req.query.status;

    if (req.query.dateFrom || req.query.dateTo) {
        filter.date = {};
        if (req.query.dateFrom) filter.date.$gte = new Date(req.query.dateFrom);
        if (req.query.dateTo) {
            const endOfDay = new Date(req.query.dateTo);
            endOfDay.setHours(23, 59, 59, 999);
            filter.date.$lte = endOfDay;
        }
    }
    return filter;
};

router.get(
    '/',
    [
        query('showroomId').optional().isMongoId(),
        query('userId').optional().isMongoId(),
        query('status').optional().isIn(['pending', 'paid']),
        query('dateFrom').optional().isISO8601(),
        query('dateTo').optional().isISO8601(),
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const filter = getFilter(req);
        const commissions = await AgentCommission.find(filter)
            .populate('user', 'name email')
            .populate('carAccount', 'receiptNumber vehicle make model')
            .sort({ date: -1 })
            .lean();

        res.json(commissions);
    })
);

router.get(
    '/export',
    [
        query('showroomId').optional().isMongoId(),
        query('userId').optional().isMongoId(),
        query('status').optional().isIn(['pending', 'paid']),
        query('dateFrom').optional().isISO8601(),
        query('dateTo').optional().isISO8601(),
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const filter = getFilter(req);
        const commissions = await AgentCommission.find(filter)
            .populate('user', 'name')
            .populate('carAccount', 'receiptNumber vehicle make model')
            .sort({ date: -1 })
            .lean();

        const columns = [
            { header: 'Date', key: 'date', width: 12 },
            { header: 'Agent', key: 'user', width: 20 },
            { header: 'Receipt No', key: 'receiptNo', width: 15 },
            { header: 'Vehicle', key: 'vehicle', width: 25 },
            { header: 'Total Amount', key: 'baseAmount', width: 15 },
            { header: 'Commission (0.5%)', key: 'amount', width: 18 },
            { header: 'Status', key: 'status', width: 12 },
        ];

        const rows = commissions.map((c) => ({
            date: new Date(c.date).toLocaleDateString('en-GB'),
            user: c.user?.name || 'Deleted User',
            receiptNo: c.carAccount?.receiptNumber || '-',
            vehicle: c.carAccount?.make ? `${c.carAccount.make} ${c.carAccount.model}` : 'N/A',
            baseAmount: c.baseAmount,
            amount: c.amount,
            status: c.status.toUpperCase(),
        }));

        const buffer = await generateExcel('Agent Commissions', columns, rows);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=agent_commissions.xlsx');
        res.send(buffer);
    })
);

router.post(
    '/pay/:id',
    [param('id').isMongoId()],
    asyncHandler(async (req, res) => {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admins can mark commissions as paid.' });

        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const commission = await AgentCommission.findById(req.params.id);
        if (!commission) return res.status(404).json({ message: 'Commission record not found.' });

        commission.status = 'paid';
        await commission.save();

        res.json(commission);
    })
);

export default router;
