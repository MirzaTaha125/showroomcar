/**
 * Validate required environment variables
 * Throws error if any required variable is missing
 */
export function validateEnv() {
  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
    'PORT',
    'FRONTEND_URL',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file.'
    );
  }
  
  // Validate JWT_SECRET is not the default
  if (process.env.JWT_SECRET === 'CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_IN_PRODUCTION') {
    console.warn(
      '\x1b[33m[WARNING]\x1b[0m JWT_SECRET is using the default value. ' +
      'Please change it to a secure random string in production!'
    );
  }
  
  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET.length < 32) {
    console.warn(
      '\x1b[33m[WARNING]\x1b[0m JWT_SECRET should be at least 32 characters long for security.'
    );
  }
  
  console.log('\x1b[32m✓\x1b[0m Environment variables validated');
}
