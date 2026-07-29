/**
 * Wraps async route handlers so any rejected promise is passed to Express error handler.
 * Express 4 does not catch async errors; without this, unhandled rejections can cause 500s
 * with no proper response or double-send.
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
