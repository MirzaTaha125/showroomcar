// Sanitize user input to prevent NoSQL injection

export function sanitizeInput(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      // Remove keys that start with $ (MongoDB operators)
      if (typeof key === 'string' && key.startsWith('$')) {
        continue;
      }

      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeInput(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

// Middleware to sanitize request body
export function sanitizeBody(req, res, next) {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  next();
}

// Middleware to sanitize query params
export function sanitizeQuery(req, res, next) {
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  next();
}
