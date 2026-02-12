import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Transaction from '../models/Transaction.js';
import CarAccount from '../models/CarAccount.js';
import Vehicle from '../models/Vehicle.js';
import { protect, restrictToShowroom } from '../middleware/auth.js';
import { logActivity } from '../utils/activityLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.use(protect);
router.use(restrictToShowroom);

const CAR_ACCOUNT_TYPE = 'sale';
/** Controllers can only edit/delete a car account within this window (ms). */
const CONTROLLER_EDIT_WINDOW_MS = 12 * 60 * 60 * 1000;

function getNextReceiptNumber() {
  return `RCP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/** List car accounts (CarAccount model; each has transaction + vehicle) */
router.get(
  '/',
  query('showroomId').optional().isMongoId(),
  query('documentTitle').optional().trim(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const filter = {};
    if (req.user.role === 'admin') {
      if (req.query.showroomId) filter.showroom = req.query.showroomId;
    } else {
      filter.showroom = req.showroomId;
    }
    if (req.query.documentTitle) {
      filter.documentTitle = req.query.documentTitle;
    }
    const carAccounts = await CarAccount.find(filter)
      .populate('showroom', 'name address phone ownerName logoPath')
      .populate('vehicle')
      .populate('transaction')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json(carAccounts);
  })
);

/** Get one car account by id */
router.get(
  '/:id',
  param('id').isMongoId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const doc = await CarAccount.findById(req.params.id)
      .populate('showroom', 'name address phone ownerName logoPath')
      .populate('vehicle')
      .populate('transaction')
      .populate('createdBy', 'name email')
      .lean();
    if (!doc) return res.status(404).json({ message: 'Car account not found.' });
    const docShowroomId = doc.showroom?._id?.toString?.() || doc.showroom?.toString?.();
    if (req.user.role !== 'admin' && docShowroomId !== req.showroomId) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    res.json(doc);
  })
);

/** Create car account (sale only): either from inventory vehicle OR inline vehicle (not saved to inventory) */
router.post(
  '/',
  [
    body('showroom').optional().isMongoId(),
    body('vehicle').optional().isMongoId(),
    body('cplcVerification').optional().trim(),
    body('cplcDate').optional({ nullable: true, checkFalsy: true }),
    body('cplcTime').optional().trim(),
    body('purchaserName').optional().trim(),
    body('purchaserCnic').optional().trim(),
    body('purchaserPhone').optional().trim(),
    body('purchaserAddress').optional().trim(),
    body('ownerPhone').optional().trim(),
    body('agentName').optional().trim(),
    body('agentCnic').optional().trim(),
    body('agentAddress').optional().trim(),
    body('agentPhone').optional().trim(),
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
    body('commission').optional({ checkFalsy: true }).isFloat({ min: 0, max: 100 }),
    body('transactionDate').optional({ checkFalsy: true }).isISO8601(),
    body('notes').optional().trim(),
    body('remarks').optional().trim(),
    body('ownerThumbImpression').optional().trim(),
    body('titleStampSign').optional().trim(),
    body('sellerSignature').optional().trim(),
    body('purchaserSignature').optional().trim(),
    body('biometricContent').optional().trim(),
    body('biometricSigningDate').optional({ checkFalsy: true }).isISO8601(),
    body('biometricImagePath').optional().trim(),
    body('forCarDealers').optional().isBoolean(),
    body('registrationNo').optional().trim(),
    body('dateOfRegistration').optional({ checkFalsy: true }).isISO8601(),
    body('chassisNo').optional().trim(),
    body('engineNo').optional().trim(),
    body('make').optional().trim(),
    body('model').optional().trim(),
    body('color').optional().trim(),
    body('hp').optional().trim(),
    body('yearOfManufacturing').optional().trim(),
    body('deliveryTime').optional().trim(),
    body('registrationBookNoNew').optional().trim(),
    body('registrationBookNo').optional().trim(),
    body('salesCertificateBillOfEntryNo').optional().trim(),
    body('salesCertificateDate').optional({ checkFalsy: true }).isISO8601(),
    body('invoiceNo').optional().trim(),
    body('invoiceDate').optional({ checkFalsy: true }).isISO8601(),
    body('cplcVerification').optional().trim(),
    body('cplcDate').optional({ checkFalsy: true }).isISO8601(),
    body('cplcTime').optional().trim(),
    body('documentTitle').optional().trim(),
    body('documentDetails').optional().isArray(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('[CarAccount] Validation errors:', JSON.stringify(errors.array(), null, 2));
      return res.status(400).json({ errors: errors.array() });
    }

    const docTitle = req.body.documentTitle || '';
    let purchaserName = (req.body.purchaserName || '').trim();
    if (docTitle === 'VEHICLE PURCHASE ORDER' && !purchaserName) {
      purchaserName = req.user.name || '';
    }

    console.log('[CarAccount] Creating account for:', purchaserName);

    let showroomId;
    let make = '';
    let model = '';
    let chassisNo = '';
    let engineNo = '';
    let vehicleId = null;

    if (req.body.vehicle) {
      const vehicle = await Vehicle.findById(req.body.vehicle);
      if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
      showroomId = vehicle.showroom.toString();
      if (req.user.role !== 'admin' && showroomId !== req.showroomId) {
        return res.status(403).json({ message: 'Access denied to this vehicle.' });
      }
      if (vehicle.status !== 'available') {
        return res.status(400).json({ message: 'Vehicle is not available for sale.' });
      }
      vehicle.status = 'sold';
      await vehicle.save();
      vehicleId = vehicle._id;
      make = vehicle.make || '';
      model = vehicle.model || '';
      chassisNo = vehicle.chassisNo || '';
      engineNo = vehicle.engineNo || '';
    } else {
      showroomId = req.body.showroom ? String(req.body.showroom) : (req.user.role === 'admin' ? null : req.showroomId);
      if (!showroomId) return res.status(400).json({ message: 'Showroom is required when adding vehicle in form.' });
      if (req.user.role !== 'admin' && showroomId !== req.showroomId) {
        return res.status(403).json({ message: 'Access denied.' });
      }
      make = (req.body.make || '').trim();
      model = (req.body.model || '').trim();
      chassisNo = (req.body.chassisNo || '').trim();
      engineNo = (req.body.engineNo || '').trim();
      if (!make || !model || !chassisNo || !engineNo) {
        return res.status(400).json({ message: 'When adding vehicle in form, Make, Model, Chassis No and Engine No are required.' });
      }
    }

    const receiptNumber = getNextReceiptNumber();
    const amount = Number(req.body.amount) || 0;
    const commission = Number(req.body.commission) || 0;
    const parseDate = (d) => {
      if (!d || d === '') return null;
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    const transactionDate = parseDate(req.body.transactionDate) || new Date();

    const paymentMethods = Array.isArray(req.body.paymentMethods)
      ? req.body.paymentMethods
        .filter((pm) => pm && ['cash', 'online_banking', 'bank', 'cheque', 'token'].includes(pm.method) && typeof pm.amount === 'number' && pm.amount >= 0)
        .map((pm) => ({
          method: pm.method === 'bank' ? 'online_banking' : pm.method,
          amount: pm.amount,
          bankDetails: pm.bankDetails || undefined,
          chequeNo: pm.chequeNo || undefined,
          bankName: pm.bankName || undefined,
          accountTitle: pm.accountTitle || undefined,
          date: pm.date ? new Date(pm.date) : transactionDate,
        }))
      : [];

    const totalAmountReceived = paymentMethods.reduce((acc, pm) => acc + pm.amount, 0);
    const balance = amount - totalAmountReceived;

    let transaction;
    try {
      transaction = await Transaction.create({
        showroom: showroomId,
        type: CAR_ACCOUNT_TYPE,
        amount,
        commission,
        make,
        model,
        chassisNo,
        engineNo,
        transactionDate,
        receiptNumber,
        documentTitle: docTitle,
        amountReceived: totalAmountReceived,
        balance,
        createdBy: req.user._id,
      });

      const carAccountFields = {
        showroom: showroomId,
        vehicle: vehicleId,
        transaction: transaction._id,
        receiptNumber,
        totalAmountReceived,
        balance,
        cplcVerification: req.body.cplcVerification || '',
        cplcDate: req.body.cplcDate || null,
        cplcTime: req.body.cplcTime || '',
        purchaserName,
        purchaserCnic: req.body.purchaserCnic || '',
        purchaserPhone: req.body.purchaserPhone || '',
        purchaserAddress: req.body.purchaserAddress || '',
        purchaserSalesmanName: req.body.purchaserSalesmanName || '',
        salesmanName: req.body.salesmanName || '',
        agentName: req.body.agentName || '',
        agentCnic: req.body.agentCnic || '',
        agentAddress: req.body.agentAddress || '',
        agentPhone: req.body.agentPhone || '',
        ownerName: req.body.ownerName || '',
        ownerCnic: req.body.ownerCnic || '',
        ownerAddress: req.body.ownerAddress || '',
        ownerTelephone: req.body.ownerTelephone || '',
        ownerThumbImpression: req.body.ownerThumbImpression || '',
        paymentMethods,
        notes: req.body.notes || '',
        remarks: req.body.remarks || '',
        titleStampSign: req.body.titleStampSign || '',
        sellerSignature: req.body.sellerSignature || '',
        purchaserSignature: req.body.purchaserSignature || '',
        biometricContent: req.body.biometricContent || '',
        biometricSigningDate: parseDate(req.body.biometricSigningDate),
        biometricImagePath: req.body.biometricImagePath || '',
        createdBy: req.user._id,
        forCarDealers: req.body.forCarDealers !== false,
        documentTitle: docTitle,
        deliveryTime: req.body.deliveryTime || '',
        yearOfManufacturing: req.body.yearOfManufacturing || '',
        sellerBiometricDate: parseDate(req.body.sellerBiometricDate),
        purchaserBiometricDate: parseDate(req.body.purchaserBiometricDate),
        documentDetails: req.body.documentDetails || [],
      };

      if (!vehicleId) {
        carAccountFields.registrationNo = req.body.registrationNo || '';
        carAccountFields.dateOfRegistration = parseDate(req.body.dateOfRegistration);
        carAccountFields.chassisNo = chassisNo;
        carAccountFields.engineNo = engineNo;
        carAccountFields.make = make;
        carAccountFields.model = model;
        carAccountFields.color = req.body.color || '';
        carAccountFields.hp = req.body.hp || '';
        carAccountFields.yearOfManufacturing = req.body.yearOfManufacturing || '';
        carAccountFields.registrationBookNoNew = req.body.registrationBookNoNew || '';
        carAccountFields.registrationBookNo = req.body.registrationBookNo || '';
        carAccountFields.salesCertificateBillOfEntryNo = req.body.salesCertificateBillOfEntryNo || '';
        carAccountFields.salesCertificateDate = parseDate(req.body.salesCertificateDate);
        carAccountFields.invoiceNo = req.body.invoiceNo || '';
        carAccountFields.invoiceDate = parseDate(req.body.invoiceDate);
        carAccountFields.cplcVerification = req.body.cplcVerification || '';
        carAccountFields.cplcDate = parseDate(req.body.cplcDate);
        carAccountFields.cplcTime = req.body.cplcTime || '';
      }

      const carAccount = await CarAccount.create(carAccountFields);

      transaction.carAccount = carAccount._id;
      await transaction.save();

      await logActivity({
        userId: req.user._id,
        action: 'car_account_create',
        entityType: 'car_account',
        entityId: carAccount._id,
        showroomId,
        metadata: { receiptNumber },
      });

      const out = await CarAccount.findById(carAccount._id)
        .populate('showroom', 'name address phone ownerName logoPath')
        .populate('vehicle')
        .populate('transaction')
        .populate('createdBy', 'name email');
      res.status(201).json(out);
    } catch (dbErr) {
      console.error('[CarAccount] Database error during creation:', dbErr);

      // Rollback Transaction if it was created
      if (transaction && transaction._id) {
        try {
          await Transaction.findByIdAndDelete(transaction._id);
          console.log('[CarAccount] Rollback: Deleted orphaned Transaction', transaction._id);
        } catch (rollbackErr) {
          console.error('[CarAccount] Rollback failed (Transaction cleanup):', rollbackErr);
        }
      }

      // Rollback Vehicle status if it was changed
      if (req.body.vehicle) {
        try {
          await Vehicle.findByIdAndUpdate(req.body.vehicle, { status: 'available' });
          console.log('[CarAccount] Rollback: Reverted vehicle status to available', req.body.vehicle);
        } catch (rollbackErr) {
          console.error('[CarAccount] Rollback failed (Vehicle status revert):', rollbackErr);
        }
      }

      res.status(500).json({ message: 'Failed to create deal. Please try again.' });
    }
  })
);

/** Update car account (and linked Transaction amount/commission/date/make/model/chassis/engine) */
router.put(
  '/:id',
  [
    param('id').isMongoId(),
    body('purchaserName').optional().trim().notEmpty(),
    body('purchaserCnic').optional().trim(),
    body('purchaserPhone').optional().trim(),
    body('purchaserAddress').optional().trim(),
    body('purchaserSalesmanName').optional().trim(),
    body('ownerName').optional().trim(),
    body('ownerCnic').optional().trim(),
    body('ownerAddress').optional().trim(),
    body('ownerTelephone').optional().trim(),
    body('ownerThumbImpression').optional().trim(),
    body('salesmanName').optional().trim(),
    body('agentName').optional().trim(),
    body('agentCnic').optional().trim(),
    body('agentAddress').optional().trim(),
    body('agentPhone').optional().trim(),
    body('titleStampSign').optional().trim(),
    body('sellerSignature').optional().trim(),
    body('purchaserSignature').optional().trim(),
    body('biometricContent').optional().trim(),
    body('biometricSigningDate').optional({ nullable: true, checkFalsy: true }),
    body('cplcVerification').optional().trim(),
    body('cplcDate').optional({ nullable: true, checkFalsy: true }),
    body('cplcTime').optional().trim(),
    body('biometricImagePath').optional().trim(),
    body('forCarDealers').optional().isBoolean(),
    body('yearOfManufacturing').optional().trim(),
    body('deliveryTime').optional().trim(),
    body('amount').optional().isFloat({ min: 0 }),
    body('commission').optional().isFloat({ min: 0, max: 100 }),
    body('transactionDate').optional({ nullable: true, checkFalsy: true }),
    body('notes').optional().trim(),
    body('remarks').optional().trim(),
    body('paymentMethods').optional().isArray(),
    body('documentDetails').optional().isArray(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const carAccount = await CarAccount.findById(req.params.id).populate('transaction').populate('vehicle');
    if (!carAccount) return res.status(404).json({ message: 'Car account not found.' });
    if (req.user.role !== 'admin' && carAccount.showroom.toString() !== req.showroomId) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    try {
      const allowed = [
        'purchaserName', 'purchaserCnic', 'purchaserPhone', 'purchaserAddress',
        'purchaserSalesmanName',
        'notes', 'remarks', 'ownerName',
        'ownerCnic', 'ownerAddress', 'ownerTelephone', 'ownerThumbImpression',
        'titleStampSign', 'sellerSignature', 'purchaserSignature', 'salesmanName',
        'biometricContent', 'biometricSigningDate', 'biometricImagePath', 'forCarDealers',
        'yearOfManufacturing', 'deliveryTime',
        'registrationNo', 'dateOfRegistration', 'chassisNo', 'engineNo', 'make', 'model', 'color', 'hp',
        'agentName', 'agentCnic', 'agentAddress', 'agentPhone',
        'salesCertificateBookNoNew', 'salesCertificateBookNo', 'salesCertificateBillOfEntryNo', 'salesCertificateDate', 'invoiceNo', 'invoiceDate',
        'cplcVerification', 'cplcDate', 'cplcTime',
        'documentTitle',
        'documentDetails',
        'sellerBiometricDate', 'purchaserBiometricDate',
      ];
      allowed.forEach((key) => {
        if (req.body[key] !== undefined) carAccount[key] = req.body[key];
      });
      if (req.body.paymentMethods !== undefined && Array.isArray(req.body.paymentMethods)) {
        carAccount.paymentMethods = req.body.paymentMethods
          .filter((pm) => pm && (pm.method === 'cash' || pm.method === 'online_banking' || pm.method === 'bank' || pm.method === 'cheque' || pm.method === 'token') && typeof pm.amount === 'number' && pm.amount >= 0)
          .map((pm) => ({
            method: pm.method === 'bank' ? 'online_banking' : pm.method,
            amount: pm.amount,
            bankDetails: pm.bankDetails || undefined,
            chequeNo: pm.chequeNo || undefined,
            bankName: pm.bankName || undefined,
            accountTitle: pm.accountTitle || undefined,
            date: pm.date ? new Date(pm.date) : (carAccount.transaction?.transactionDate || carAccount.createdAt || new Date()),
          }));
        carAccount.totalAmountReceived = carAccount.paymentMethods.reduce((acc, pm) => acc + pm.amount, 0);
        carAccount.balance = (Number(req.body.amount) || carAccount.transaction?.amount || 0) - carAccount.totalAmountReceived;
      }
      await carAccount.save();

      if (carAccount.transaction) {
        if (req.body.amount !== undefined) carAccount.transaction.amount = req.body.amount;
        if (req.body.commission !== undefined) carAccount.transaction.commission = req.body.commission;
        if (req.body.transactionDate !== undefined) carAccount.transaction.transactionDate = req.body.transactionDate ? new Date(req.body.transactionDate) : carAccount.transaction.transactionDate;
        if (req.body.documentTitle !== undefined) carAccount.transaction.documentTitle = req.body.documentTitle;
        carAccount.transaction.amountReceived = carAccount.totalAmountReceived;
        carAccount.transaction.balance = carAccount.balance;
        carAccount.transaction.make = carAccount.make || '';
        carAccount.transaction.model = carAccount.model || '';
        carAccount.transaction.chassisNo = carAccount.chassisNo || '';
        carAccount.transaction.engineNo = carAccount.engineNo || '';
        await carAccount.transaction.save();
      }

      const out = await CarAccount.findById(carAccount._id)
        .populate('showroom', 'name address phone ownerName logoPath')
        .populate('vehicle')
        .populate('transaction')
        .populate('createdBy', 'name email');
      res.json(out);
    } catch (err) {
      console.error('[CarAccount] Update failed:', err);
      res.status(500).json({ message: 'Failed to update deal. Please try again.' });
    }
    await logActivity({
      userId: req.user._id,
      action: 'car_account_update',
      entityType: 'car_account',
      entityId: carAccount._id,
      showroomId: carAccount.showroom?.toString?.() || carAccount.showroom,
      metadata: { receiptNumber: carAccount.receiptNumber },
    });
    res.json(out);
  })
);

/** Delete car account (and linked Transaction; revert vehicle status) */
router.delete(
  '/:id',
  param('id').isMongoId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const carAccount = await CarAccount.findById(req.params.id).populate('vehicle').populate('transaction');
    if (!carAccount) return res.status(404).json({ message: 'Car account not found.' });
    const docShowroomId = carAccount.showroom?.toString?.();
    if (req.user.role !== 'admin' && docShowroomId !== req.showroomId) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    if (req.user.role !== 'admin') {
      const ageMs = Date.now() - new Date(carAccount.createdAt).getTime();
      if (ageMs > CONTROLLER_EDIT_WINDOW_MS) {
        return res.status(403).json({ message: 'Car accounts cannot be deleted after 12 hours.' });
      }
    }
    const receiptNumber = carAccount.receiptNumber;
    const showroomId = docShowroomId || carAccount.showroom?.toString?.();
    if (carAccount.vehicle) {
      carAccount.vehicle.status = 'available';
      await carAccount.vehicle.save();
    }
    if (carAccount.transaction) await Transaction.findByIdAndDelete(carAccount.transaction._id);
    await CarAccount.findByIdAndDelete(req.params.id);
    await logActivity({
      userId: req.user._id,
      action: 'car_account_delete',
      entityType: 'car_account',
      entityId: req.params.id,
      showroomId: showroomId || undefined,
      metadata: { receiptNumber },
    });
    res.json({ message: 'Car account deleted.' });
  })
);

export default router;
