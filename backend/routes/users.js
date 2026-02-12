import express from 'express';
import { body, param, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get('/', asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').populate('showroom').sort({ name: 1 });
  res.json(users);
}));

router.get('/:id', param('id').isMongoId(), asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const user = await User.findById(req.params.id).select('-password').populate('showroom');
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json(user);
}));

router.put(
  '/:id',
  [
    param('id').isMongoId(),
    body('name').optional().trim().notEmpty(),
    body('role').optional().isIn(['admin', 'user']),
    body('showroom').optional().isMongoId(),
    body('isActive').optional().isBoolean(),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('address').optional().trim(),
    body('phone').optional().trim(),
    body('cnic').optional().trim(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, role, showroom, isActive, password, address, phone, cnic } = req.body;
    const user = await User.findById(req.params.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (name !== undefined) user.name = name;
    if (role !== undefined) {
      user.role = role;
      if (role === 'admin') user.showroom = null;
    }
    if (showroom !== undefined && user.role === 'user') user.showroom = showroom;
    if (isActive !== undefined) user.isActive = isActive;
    if (password && password.length >= 6) user.password = password;
    if (address !== undefined) user.address = address;
    if (phone !== undefined) user.phone = phone;
    if (cnic !== undefined) user.cnic = cnic;
    await user.save();
    const u = await User.findById(user._id).select('-password').populate('showroom');
    res.json(u);
  })
);

router.delete('/:id', param('id').isMongoId(), asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const currentUserId = req.user._id?.toString?.() || req.user._id;
  if (req.params.id === currentUserId) {
    return res.status(400).json({ message: 'Cannot delete your own account.' });
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ message: 'User deleted.' });
}));

export default router;
