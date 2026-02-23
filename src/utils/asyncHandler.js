/**
 * Wraps async route handlers so thrown errors are passed to Express's
 * next() without needing a try/catch in every controller.
 *
 * @param {Function} fn - Async express route handler
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
