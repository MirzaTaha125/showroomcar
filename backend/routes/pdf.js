import express from 'express';
import { param, validationResult } from 'express-validator';
import Transaction from '../models/Transaction.js';
import { protect, restrictToShowroom } from '../middleware/auth.js';
import { generateReceiptTwoPagesPDF } from '../services/pdfService.js';
import { logActivity } from '../utils/activityLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();
const baseUrl = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Require auth so req.user and req.showroomId are set
router.use(protect);
router.use(restrictToShowroom);

/** Load transaction; if it has carAccount, merge carAccount + vehicle for PDF (one object with all fields). */
async function assertTransactionAccess(req, transactionId) {
  const transaction = await Transaction.findById(transactionId)
    .populate('showroom', 'name address phone ownerName cnic nic socialLinks logoPath')
    .populate({ path: 'carAccount', populate: { path: 'vehicle' } })
    .populate('createdBy', 'name email address phone cnic');
  if (!transaction) return { error: 404, message: 'Transaction not found.' };
  const showroomId = transaction.showroom?._id?.toString?.() || transaction.showroom?.toString?.();
  if (req.user.role !== 'admin' && showroomId !== req.showroomId) {
    return { error: 403, message: 'Access denied.' };
  }
  const ca = transaction.carAccount;
  let vehicle = ca?.vehicle ?? null;
  if (!vehicle && ca && (ca.make || ca.chassisNo)) {
    vehicle = {
      registrationNo: ca.registrationNo,
      dateOfRegistration: ca.dateOfRegistration,
      chassisNo: ca.chassisNo,
      engineNo: ca.engineNo,
      make: ca.make,
      model: ca.model,
      color: ca.color,
      hp: ca.hp,
      yearOfManufacturing: ca.yearOfManufacturing,
      registrationBookNoNew: ca.registrationBookNoNew,
      registrationBookNo: ca.registrationBookNo,
      salesCertificateBillOfEntryNo: ca.salesCertificateBillOfEntryNo,
      salesCertificateDate: ca.salesCertificateDate,
      invoiceNo: ca.invoiceNo,
      invoiceDate: ca.invoiceDate,
      cplcVerification: ca.cplcVerification,
      cplcDate: ca.cplcDate,
      cplcTime: ca.cplcTime,
      sellerBiometricDate: ca.sellerBiometricDate,
      purchaserBiometricDate: ca.purchaserBiometricDate,
    };
  }
  const merged = {
    ...transaction.toObject(),
    ...(ca ? ca.toObject() : {}),
    _id: transaction._id, // Ensure Transaction ID is preserved (prevent ca._id overwrite)
    vehicle,
    showroom: transaction.showroom,
    createdBy: transaction.createdBy,
  };
  return { transaction: merged };
}

async function incrementPdfCountAndLinks(transactionId, type, generatedByUserId) {
  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) return;
    transaction.pdfCount = (transaction.pdfCount || 0) + 1;
    if (type === 'customer') {
      transaction.customerPdfLink = `${baseUrl}/pdf/receipt/${transactionId}`;
    } else {
      transaction.internalPdfLink = `${baseUrl}/pdf/internal/${transactionId}`;
    }
    if (generatedByUserId) {
      if (Array.isArray(transaction.pdfGeneratedBy)) transaction.pdfGeneratedBy.push(generatedByUserId);
      else transaction.pdfGeneratedBy = [generatedByUserId];
    }
    await transaction.save();
  } catch (_) { }
}

router.get(
  '/receipt/:transactionId',
  param('transactionId').isMongoId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const result = await assertTransactionAccess(req, req.params.transactionId);
    if (result.error) return res.status(result.error).json({ message: result.message });
    const { transaction } = result;
    const pdf = await generateReceiptTwoPagesPDF(transaction);
    // Send PDF immediately so client gets the file even if post-actions fail
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${transaction.receiptNumber || transaction._id}.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    res.end(pdf, 'binary');
    // Fire-and-forget: don't block response; failures must not cause 500 for the user
    const transactionId = req.params.transactionId;
    const showroomId = transaction.showroom?._id?.toString?.() || transaction.showroom?.toString?.();
    incrementPdfCountAndLinks(transactionId, 'customer', req.user._id).catch(() => { });
    logActivity({
      userId: req.user._id,
      action: 'pdf_download',
      entityType: 'transaction',
      entityId: transactionId,
      showroomId: showroomId || undefined,
      metadata: { type: 'receipt', receiptNumber: transaction.receiptNumber },
    }).catch(() => { });
  })
);

router.get(
  '/internal/:transactionId',
  param('transactionId').isMongoId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const result = await assertTransactionAccess(req, req.params.transactionId);
    if (result.error) return res.status(result.error).json({ message: result.message });
    const { transaction } = result;
    const pdf = await generateReceiptTwoPagesPDF(transaction);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${transaction.receiptNumber || transaction._id}.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    res.end(pdf, 'binary');
    const transactionId = req.params.transactionId;
    const showroomId = transaction.showroom?._id?.toString?.() || transaction.showroom?.toString?.();
    incrementPdfCountAndLinks(transactionId, 'internal', req.user._id).catch(() => { });
    logActivity({
      userId: req.user._id,
      action: 'pdf_download',
      entityType: 'transaction',
      entityId: transactionId,
      showroomId: showroomId || undefined,
      metadata: { type: 'internal', receiptNumber: transaction.receiptNumber },
    }).catch(() => { });
  })
);

export default router;
