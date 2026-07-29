import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

async function protectRun(req, res, next) {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    res.status(401).json({ message: 'Not authorized. No token.' });
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database not ready. Please try again.' });
      return;
    }
    const user = await User.findById(decoded.id).populate('showroom').lean();
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'User not found or inactive.' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Not authorized. Token invalid or expired.' });
      return;
    }
    console.error('[protect]', err.message || err);
    next(err);
  }
}

/** Auth middleware: ensures async errors are passed to Express (Express 4 does not await async middleware). */
export const protect = (req, res, next) => {
  Promise.resolve(protectRun(req, res, next)).catch(next);
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
};

export const restrictToShowroom = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  const showroom = req.user?.showroom;
  const showroomId = showroom?._id?.toString?.() || showroom?.toString?.();
  if (!showroomId) {
    return res.status(403).json({ message: 'No showroom assigned.' });
  }
  req.showroomId = showroomId;
  next();
};
