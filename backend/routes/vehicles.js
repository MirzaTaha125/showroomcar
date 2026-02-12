import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Vehicle from '../models/Vehicle.js';
import CarAccount from '../models/CarAccount.js';
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
    if (req.query.status) filter.status = req.query.status;
    const vehicles = await Vehicle.find(filter)
      .populate('showroom', 'name address phone')
      .populate('addedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json(vehicles);
  })
);

router.get(
  '/:id',
  param('id').isMongoId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('showroom', 'name address phone')
      .populate('addedBy', 'name email')
      .lean();
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    const vehicleShowroomId = vehicle.showroom?._id?.toString?.() || vehicle.showroom?.toString?.();
    if (req.user.role !== 'admin' && vehicleShowroomId !== req.showroomId) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    res.json(vehicle);
  })
);

const vehicleFields = [
  body('chassisNo').trim().notEmpty().withMessage('Chassis number is required'),
  body('engineNo').trim().notEmpty().withMessage('Engine number is required'),
  body('make').trim().notEmpty().withMessage('Make is required'),
  body('model').trim().notEmpty().withMessage('Model is required'),
  body('color').trim().notEmpty().withMessage('Color is required'),
  body('hp').optional().trim(),
  body('yearOfManufacturing').optional().trim(),
  body('yearOfManufacturing').optional().trim(),
  body('registrationBookNo').optional().trim(),
  body('salesCertificate').optional().trim(),
  body('invoiceNo').optional().trim(),
  body('cplcVerification').optional().trim(),
  body('showroom').optional().isMongoId(),
];

router.post(
  '/',
  [...vehicleFields],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const showroomId = req.user.role === 'admin' ? req.body.showroom : req.showroomId;
    if (!showroomId) return res.status(400).json({ message: 'Showroom is required.' });
    try {
      const vehicle = await Vehicle.create({
        ...req.body,
        showroom: showroomId,
        addedBy: req.user._id,
      });
      await logActivity({
        userId: req.user._id,
        action: 'vehicle_create',
        entityType: 'vehicle',
        entityId: vehicle._id,
        showroomId,
        metadata: { chassisNo: vehicle.chassisNo, make: vehicle.make, model: vehicle.model },
      });
      const v = await Vehicle.findById(vehicle._id)
        .populate('showroom', 'name address phone')
        .populate('addedBy', 'name email');
      res.status(201).json(v);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ message: 'Vehicle with this chassis number already exists in this showroom.' });
      }
      throw err;
    }
  })
);

// Fields that can be updated on a vehicle (must match Vehicle schema + frontend form)
const vehicleUpdateFields = [
  'chassisNo', 'engineNo', 'make', 'model', 'color', 'hp', 'yearOfManufacturing',
  'registrationNo', 'dateOfRegistration', 'registrationBookNoNew', 'registrationBookNo',
  'salesCertificate', 'salesCertificateBillOfEntryNo', 'salesCertificateDate',
  'invoiceNo', 'invoiceDate', 'cplcVerification', 'cplcDate', 'cplcTime',
  'status',
];

router.put(
  '/:id',
  [
    param('id').isMongoId(),
    body('chassisNo').optional().trim().notEmpty(),
    body('engineNo').optional().trim().notEmpty(),
    body('make').optional().trim().notEmpty(),
    body('model').optional().trim().notEmpty(),
    body('color').optional().trim().notEmpty(),
    body('hp').optional().trim(),
    body('registrationNo').optional().trim(),
    body('dateOfRegistration').optional().isISO8601().withMessage('Invalid date').optional({ values: 'falsy' }),
    body('registrationBookNoNew').optional().trim(),
    body('registrationBookNo').optional().trim(),
    body('salesCertificate').optional().trim(),
    body('salesCertificateBillOfEntryNo').optional().trim(),
    body('salesCertificateDate').optional().isISO8601().withMessage('Invalid date').optional({ values: 'falsy' }),
    body('invoiceNo').optional().trim(),
    body('invoiceDate').optional().isISO8601().withMessage('Invalid date').optional({ values: 'falsy' }),
    body('cplcVerification').optional().trim(),
    body('cplcDate').optional().isISO8601().withMessage('Invalid date').optional({ values: 'falsy' }),
    body('cplcTime').optional().trim(),
    body('status').optional().isIn(['available', 'sold']),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    const showroomId = vehicle.showroom?.toString?.();
    if (req.user.role !== 'admin' && showroomId !== req.showroomId) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const dateKeys = ['dateOfRegistration', 'salesCertificateDate', 'invoiceDate', 'cplcDate'];
    vehicleUpdateFields.forEach((key) => {
      if (req.body[key] === undefined) return;
      const val = req.body[key];
      vehicle[key] = dateKeys.includes(key) && (val === '' || val == null) ? null : val;
    });
    await vehicle.save();

    // Sync inline vehicle details in CarAccounts that reference this vehicle
    const inlineVehicleFields = [
      'registrationNo', 'dateOfRegistration', 'chassisNo', 'engineNo', 'make', 'model', 'color', 'hp', 'yearOfManufacturing',
      'registrationBookNoNew', 'registrationBookNo', 'salesCertificateBillOfEntryNo', 'salesCertificateDate',
      'invoiceNo', 'invoiceDate', 'cplcVerification', 'cplcDate', 'cplcTime',
    ];
    const updatePayload = {};
    inlineVehicleFields.forEach((key) => { updatePayload[key] = vehicle[key]; });
    await CarAccount.updateMany(
      { vehicle: vehicle._id },
      { $set: updatePayload }
    );

    await logActivity({
      userId: req.user._id,
      action: 'vehicle_update',
      entityType: 'vehicle',
      entityId: vehicle._id,
      showroomId: vehicle.showroom?.toString?.(),
      metadata: { chassisNo: vehicle.chassisNo, make: vehicle.make, model: vehicle.model },
    });

    const v = await Vehicle.findById(vehicle._id)
      .populate('showroom', 'name address phone')
      .populate('addedBy', 'name email');
    res.json(v);
  })
);

router.delete(
  '/:id',
  param('id').isMongoId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    const showroomId = vehicle.showroom?.toString?.();
    if (req.user.role !== 'admin' && showroomId !== req.showroomId) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    await logActivity({
      userId: req.user._id,
      action: 'vehicle_delete',
      entityType: 'vehicle',
      entityId: vehicle._id,
      showroomId: showroomId || undefined,
      metadata: { chassisNo: vehicle.chassisNo, make: vehicle.make, model: vehicle.model },
    });
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vehicle deleted.' });
  })
);

export default router;
