import validator from 'validator';

/**
 * Helpers for logging in with either a username or an email address.
 *
 * Usernames are stored lowercase and may not contain '@', so an identifier containing '@'
 * can only ever be an email — but we still match both fields, which keeps the lookup a
 * single query and avoids leaking which field matched.
 */

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
export const USERNAME_RULE = 'Username must be 3-30 characters: letters, numbers, dot, underscore or hyphen (no spaces or @).';

/** Normalize a username for storage and comparison. Returns undefined for blank input, never ''. */
export function normalizeUsername(value) {
  const trimmed = String(value ?? '').trim().toLowerCase();
  return trimmed === '' ? undefined : trimmed;
}

/** True when `value` is a well-formed username. Expects an already-normalized value. */
export function isValidUsername(value) {
  return typeof value === 'string' && USERNAME_PATTERN.test(value);
}

/**
 * Build the `$or` conditions that match a login identifier against username or email.
 * Registration stores emails via validator's normalizeEmail (which lowercases and, for some
 * providers, strips dots and sub-addresses), so the normalized form is included as well —
 * otherwise "First.Last@gmail.com" would stop matching the stored "firstlast@gmail.com".
 */
export function buildLoginQuery(rawIdentifier) {
  const value = String(rawIdentifier ?? '').trim();
  if (value === '') return null;

  const lower = value.toLowerCase();
  const conditions = [{ username: lower }];

  if (value.includes('@')) {
    conditions.push({ email: lower });
    const normalized = validator.normalizeEmail(value);
    if (normalized && normalized !== lower) conditions.push({ email: normalized });
  }

  return { $or: conditions };
}
