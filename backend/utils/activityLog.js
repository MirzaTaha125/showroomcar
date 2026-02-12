import ActivityLog from '../models/ActivityLog.js';

export async function logActivity({ userId, action, entityType = '', entityId = null, showroomId = null, metadata = {} }) {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      entityType,
      entityId,
      showroom: showroomId,
      metadata,
    });
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
}
