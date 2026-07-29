/**
 * Ensures user can only access resources belonging to their showroom.
 * Use after protect + restrictToShowroom. Expects req.showroomId (for users) or full access for admin.
 */
export const validateShowroomResource = (getShowroomId) => (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  const resourceShowroomId = getShowroomId(req);
  if (!resourceShowroomId || resourceShowroomId !== req.showroomId) {
    return res.status(403).json({ message: 'Access denied to this resource.' });
  }
  next();
};
