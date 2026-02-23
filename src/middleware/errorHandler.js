import logger from '../utils/logger.js';
import multer from 'multer';

/**
 * Handles Multer-specific errors with user-friendly messages.
 */
const handleMulterError = (err) => {
  const MulterError = multer.MulterError;
  if (err instanceof MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return { message: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 5}MB.`, statusCode: 413 };
      case 'LIMIT_FILE_COUNT':
        return { message: 'Too many files. Upload one file at a time.', statusCode: 400 };
      case 'LIMIT_UNEXPECTED_FILE':
        return { message: 'Unexpected field name. Use "resume" as the form field name.', statusCode: 400 };
      default:
        return { message: `Upload error: ${err.message}`, statusCode: 400 };
    }
  }
  return null;
};

/**
 * Handles Mongoose validation errors.
 */
const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  return { message: `Validation failed: ${messages.join('. ')}`, statusCode: 400 };
};

/**
 * Handles Mongoose duplicate key errors.
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue || {})[0];
  return {
    message: `Duplicate value for field: ${field}. Please use another value.`,
    statusCode: 409,
  };
};

/**
 * Handles Mongoose CastError (e.g. invalid ObjectId format).
 */
const handleCastError = (err) => ({
  message: `Invalid value for field "${err.path}": ${err.value}`,
  statusCode: 400,
});

// ─── Main Error Handler ───────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
const globalErrorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected error occurred.';

  // Try specialized handlers
  const multerOverride = handleMulterError(err);
  if (multerOverride) {
    ({ statusCode, message } = multerOverride);
  } else if (err.name === 'ValidationError') {
    ({ statusCode, message } = handleValidationError(err));
  } else if (err.code === 11000) {
    ({ statusCode, message } = handleDuplicateKeyError(err));
  } else if (err.name === 'CastError') {
    ({ statusCode, message } = handleCastError(err));
  }

  // Log unexpected (non-operational) errors with full stack
  if (!err.isOperational) {
    logger.error(`UNEXPECTED ERROR on ${req.method} ${req.path}: ${err.stack}`);
  } else {
    logger.warn(`Operational error [${statusCode}]: ${message}`);
  }

  const response = {
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
  };

  // Include stack trace in development only
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default globalErrorHandler;
