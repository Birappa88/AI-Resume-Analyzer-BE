import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';

/**
 * Middleware that validates `:id` route params are valid MongoDB ObjectIds.
 * Returns 400 immediately if invalid, preventing wasted DB lookups.
 */
const validateMongoId = (req, _res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new AppError(`Invalid ID format: "${req.params.id}"`, 400));
  }
  next();
};

export { validateMongoId };
