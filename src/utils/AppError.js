/**
 * Custom operational error class.
 * Distinguishes expected app errors (e.g. 404, 400) from
 * unexpected programmer errors so the global handler can respond appropriately.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = String(statusCode).startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Preserve correct stack trace (V8 only)
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
