/**
 * Request logging middleware
 * Logs HTTP requests with method, path, status, and duration
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    
    // Color code based on status
    const statusColor = statusCode >= 500 ? '\x1b[31m' // Red for 5xx
      : statusCode >= 400 ? '\x1b[33m' // Yellow for 4xx
      : statusCode >= 300 ? '\x1b[36m' // Cyan for 3xx
      : '\x1b[32m'; // Green for 2xx
    
    const reset = '\x1b[0m';
    
    console.log(
      `${statusColor}${method}${reset} ${originalUrl} ${statusColor}${statusCode}${reset} ${duration}ms ${ip || ''}`
    );
  });
  
  next();
}

/**
 * Error logger middleware
 * Logs errors with stack trace in development
 */
export function errorLogger(err, req, res, next) {
  const { method, originalUrl } = req;
  
  console.error('\x1b[31m[ERROR]\x1b[0m', {
    method,
    url: originalUrl,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
  
  next(err);
}
