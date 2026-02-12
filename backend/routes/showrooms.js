import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { body, param, validationResult } from 'express-validator';
import Showroom from '../models/Showroom.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();
const uploadsDir = path.join(process.cwd(), 'uploads', 'logos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.png').toLowerCase();
    const safe = `${Date.now()}-${(file.originalname || 'logo').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    cb(null, safe);
  },
});
const uploadLogo = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|png|gif|webp)$/i;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only images (JPEG, PNG, GIF, WebP) are allowed.'));
  },
}).single('logo');

router.use(protect);
router.use(adminOnly);

router.get('/', asyncHandler(async (req, res) => {
  const showrooms = await Showroom.find().sort({ name: 1 }).lean();
  res.json(showrooms);
}));

router.post('/upload-logo', (req, res) => {
  uploadLogo(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Logo upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    const logoPath = `/api/uploads/logos/${req.file.filename}`;
    res.json({ logoPath });
  });
});

router.get('/:id', param('id').isMongoId(), asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const showroom = await Showroom.findById(req.params.id).lean();
  if (!showroom) return res.status(404).json({ message: 'Showroom not found.' });
  res.json(showroom);
}));

const socialAndLogo = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('address').optional().trim(),
  body('phone').optional().trim(),
  body('logoPath').optional().trim(),
  body('ownerName').optional().trim(),
  body('cnic').optional().trim(),
  body('nic').optional().trim(),
  body('socialLinks.facebook').optional().trim(),
  body('socialLinks.instagram').optional().trim(),
  body('socialLinks.whatsapp').optional().trim(),
  body('socialLinks.website').optional().trim(),
];

router.post('/', socialAndLogo, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const showroom = await Showroom.create(req.body);
  res.status(201).json(showroom);
}));

router.put(
  '/:id',
  [
    param('id').isMongoId(),
    body('name').optional({ checkFalsy: true }).trim().notEmpty().withMessage('Name cannot be empty'),
    body('address').optional().trim(),
    body('phone').optional().trim(),
    body('logoPath').optional().trim(),
    body('ownerName').optional().trim(),
    body('cnic').optional().trim(),
    body('nic').optional().trim(),
    body('isActive').optional({ checkFalsy: true }).toBoolean(),
    body('socialLinks').optional().isObject(),
    body('socialLinks.facebook').optional().trim(),
    body('socialLinks.instagram').optional().trim(),
    body('socialLinks.whatsapp').optional().trim(),
    body('socialLinks.website').optional().trim(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { socialLinks, ...rest } = req.body;
    const update = {};
    ['name', 'address', 'phone', 'logoPath', 'ownerName', 'cnic', 'nic', 'isActive'].forEach((field) => {
      if (rest[field] !== undefined) update[field] = rest[field];
    });
    if (socialLinks !== undefined && socialLinks !== null && typeof socialLinks === 'object') {
      const existing = await Showroom.findById(req.params.id).select('socialLinks').lean();
      update.socialLinks = { ...(existing?.socialLinks || {}), ...socialLinks };
    }
    const showroom = await Showroom.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!showroom) return res.status(404).json({ message: 'Showroom not found.' });
    res.json(showroom);
  })
);

router.delete('/:id', param('id').isMongoId(), asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const showroom = await Showroom.findByIdAndDelete(req.params.id);
  if (!showroom) return res.status(404).json({ message: 'Showroom not found.' });
  res.json({ message: 'Showroom deleted.' });
}));

export default router;
