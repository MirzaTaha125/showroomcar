/**
 * Ownership scoping for non-admin users (role 'user', shown as "Controller" in the UI).
 *
 * `restrictToShowroom` already narrows controllers to their own showroom. These helpers
 * narrow them one step further, to only the records they created themselves, so two
 * controllers in the same showroom cannot see each other's work. Admins are unaffected.
 *
 * Vehicle inventory is deliberately NOT scoped this way — it stays showroom-wide so a
 * controller can still write an order against stock someone else entered.
 */

/** Normalize a populated document or raw ObjectId reference to a comparable string. */
function refId(value) {
  if (!value) return '';
  if (value._id) return value._id.toString();
  return typeof value.toString === 'function' ? value.toString() : '';
}

/** Force a Mongo filter to the current user's own records when they aren't an admin. Mutates and returns `filter`. */
export function scopeToOwner(req, filter, ownerField = 'createdBy') {
  if (req.user?.role !== 'admin') {
    filter[ownerField] = req.user._id;
  }
  return filter;
}

/**
 * True when the current user may read or modify `doc`.
 * Admins always may; controllers only for documents in their showroom that they created.
 */
export function ownsDocument(req, doc, ownerField = 'createdBy') {
  if (req.user?.role === 'admin') return true;
  if (!doc) return false;
  if (refId(doc.showroom) !== req.showroomId) return false;
  return refId(doc[ownerField]) === refId(req.user._id);
}
