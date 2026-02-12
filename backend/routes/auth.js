import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { logActivity } from '../utils/activityLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

router.post(
  '/register',
  protect,
  adminOnly,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['admin', 'user']).withMessage('Invalid role'),
    body('showroom').optional().isMongoId().withMessage('Invalid showroom ID'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, email, password, role = 'user', showroom, address, phone, cnic } = req.body;
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already registered.' });
    }
    const user = await User.create({
      name,
      email,
      password,
      role,
      showroom: role === 'user' ? showroom || null : null,
      address,
      phone,
      cnic,
    });
    const u = await User.findById(user._id).select('-password').populate('showroom');
    res.status(201).json({ user: u, token: generateToken(user._id) });
  })
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password').populate('showroom');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const match = await user.matchPassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password.' });
    await logActivity({ userId: user._id, action: 'login', showroomId: user.showroom?._id || user.showroom });
    const u = await User.findById(user._id).select('-password').populate('showroom');
    res.json({ user: u, token: generateToken(user._id) });
  })
);

router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

router.put(
  '/me',
  protect,
  [
    body('name').optional().trim().notEmpty(),
    body('password').optional().isLength({ min: 6 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const user = await User.findById(req.user._id).select('+password');
    if (req.body.name) user.name = req.body.name;
    if (req.body.password) user.password = req.body.password;
    await user.save();
    const u = await User.findById(user._id).select('-password').populate('showroom');
    res.json({ user: u });
  })
);

export default router;
