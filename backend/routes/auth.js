import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { logActivity } from '../utils/activityLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildLoginQuery, normalizeUsername, isValidUsername, USERNAME_RULE } from '../utils/loginIdentifier.js';

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
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['admin', 'user']).withMessage('Invalid role'),
    body('showroom').optional().isMongoId().withMessage('Invalid showroom ID'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, email, password, role = 'user', showroom, address, phone, cnic } = req.body;
    const username = normalizeUsername(req.body.username);
    if (!isValidUsername(username)) {
      return res.status(400).json({ message: USERNAME_RULE });
    }
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already registered.' });
    }
    if (await User.findOne({ username })) {
      return res.status(400).json({ message: 'Username already taken.' });
    }
    let user;
    try {
      user = await User.create({
        name,
        email,
        username,
        password,
        role,
        showroom: role === 'user' ? showroom || null : null,
        address,
        phone,
        cnic,
      });
    } catch (err) {
      // Unique index can still fire if two admins submit the same handle at once
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0];
        return res.status(400).json({ message: field === 'username' ? 'Username already taken.' : 'Email already registered.' });
      }
      throw err;
    }
    const u = await User.findById(user._id).select('-password').populate('showroom');
    res.status(201).json({ user: u, token: generateToken(user._id) });
  })
);

router.post(
  '/login',
  [
    body('password').notEmpty(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { password } = req.body;
    // `identifier` is what the login form sends; `email` is still accepted so any older
    // client (or a saved API call) keeps working unchanged.
    const query = buildLoginQuery(req.body.identifier ?? req.body.email);
    if (!query) {
      return res.status(400).json({ message: 'Username or email is required.' });
    }
    const user = await User.findOne(query).select('+password').populate('showroom');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const match = await user.matchPassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials.' });
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
