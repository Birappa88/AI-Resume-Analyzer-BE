import express from 'express';
import upload from '../config/multer.js';
import {
  uploadResume,
  analyzeResumeById,
  getAllResumes,
  getResumeById,
  deleteResume,
} from '../controllers/resumeController.js';
import { validateMongoId } from '../middleware/validateMongoId.js';

const router = express.Router();

/**
 * @route   GET /api/resumes
 * @desc    List all resumes (paginated, no text content)
 * @query   page, limit
 */
router.get('/', getAllResumes);

/**
 * @route   GET /api/resumes/:id
 * @desc    Get single resume with full text & analysis
 */
router.get('/:id', validateMongoId, getResumeById);

/**
 * @route   POST /api/resumes/upload
 * @desc    Upload a PDF resume; extract & save text
 * @body    multipart/form-data — field name: "resume"
 */
router.post('/upload', upload.single('resume'), uploadResume);

/**
 * @route   POST /api/resumes/:id/analyze
 * @desc    Run AI analysis on an uploaded resume
 * @body    (optional) { jobDescription: string }
 */
router.post('/:id/analyze', validateMongoId, analyzeResumeById);

/**
 * @route   DELETE /api/resumes/:id
 * @desc    Delete a resume record and its file
 */
router.delete('/:id', validateMongoId, deleteResume);

export default router;
