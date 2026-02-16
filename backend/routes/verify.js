import express from 'express';
import Transaction from '../models/Transaction.js';

const router = express.Router();

/** Same handler for both /api/verify/:id and /api/verify-sale/:id. Uses CarAccount for purchaserName and vehicle (Transaction has no vehicle/purchaserName). */
async function getVerification(req, res) {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('showroom', 'name address phone logoPath socialLinks ownerName')
      .populate({ path: 'carAccount', populate: { path: 'vehicle' } });
    if (!transaction) {
      return res.status(404).json({
        valid: false,
        message: 'Receipt not found. It may have been removed or the link is invalid.',
      });
    }
    const ca = transaction.carAccount;
    let vehicle = null;
    if (ca?.vehicle && typeof ca.vehicle === 'object') {
      vehicle = {
        registrationNo: ca.vehicle.registrationNo || ca.registrationNo || '',
        chassisNo: ca.vehicle.chassisNo,
        engineNo: ca.vehicle.engineNo,
        make: ca.vehicle.make,
        model: ca.vehicle.model,
        color: ca.vehicle.color,
        hp: ca.vehicle.hp || ca.hp || '',
      };
    } else if (ca && (ca.chassisNo || ca.make)) {
      vehicle = {
        registrationNo: ca.registrationNo || '',
        chassisNo: ca.chassisNo || '',
        engineNo: ca.engineNo || '',
        make: ca.make || '',
        model: ca.model || '',
        color: ca.color || '',
        hp: ca.hp || '',
      };
    }
    const showroom = transaction.showroom
      ? {
        name: transaction.showroom.name,
        address: transaction.showroom.address,
        phone: transaction.showroom.phone,
        logoPath: transaction.showroom.logoPath,
        socialLinks: transaction.showroom.socialLinks,
        ownerName: transaction.showroom.ownerName
      }
      : null;
    res.json({
      valid: true,
      receiptNumber: transaction.receiptNumber,
      type: transaction.type,
      transactionDate: transaction.transactionDate,
      showroom,
      vehicle,
      ownerName: ca?.ownerName ?? null,
      purchaserName: ca?.purchaserName ?? null,
      verifiedAt: ca?.createdAt ?? null,
    });
  } catch (err) {
    res.status(500).json({ valid: false, message: 'Verification failed.' });
  }
}

router.get('/:id', getVerification);

export default router;
