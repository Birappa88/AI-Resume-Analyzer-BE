import path from 'path';
import fs from 'fs';
import Resume from '../models/Resume.js';
import { extractTextFromPDF } from '../services/pdfService.js';
import { analyzeResume } from '../services/aiService.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

// ─── Upload & Extract ────────────────────────────────────────────────────────────

/**
 * POST /api/resumes/upload
 * Accepts a PDF, extracts text, persists to MongoDB.
 */
const uploadResume = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a PDF file.', 400));
  }

  const { originalname, filename, path: filePath, size, mimetype } = req.file;

  // Create the DB record (initially with status "uploaded")
  let resume = await Resume.create({
    filename,
    originalName: originalname,
    filePath,
    fileSizeBytes: size,
    mimeType: mimetype,
    status: 'uploaded',
  });

  // Extract text from PDF
  let extracted;
  try {
    extracted = await extractTextFromPDF(filePath);
  } catch (err) {
    // Mark as failed but don't lose the DB record
    await Resume.findByIdAndUpdate(resume._id, {
      status: 'failed',
      errorMessage: err.message,
    });
    return next(err);
  }

  // Update record with extracted content
  resume = await Resume.findByIdAndUpdate(
    resume._id,
    {
      extractedText: extracted.text,
      pageCount: extracted.pageCount,
      wordCount: extracted.wordCount,
      status: 'processed',
    },
    { new: true }
  );

  logger.info(`Resume uploaded and processed: ${resume._id}`);

  res.status(201).json({
    status: 'success',
    message: 'Resume uploaded and text extracted successfully.',
    data: {
      resume: sanitizeResume(resume),
    },
  });
});

// ─── Analyze ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/resumes/:id/analyze
 * Runs AI analysis on a previously uploaded resume.
 */
const analyzeResumeById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const resume = await Resume.findById(id);
  if (!resume) {
    return next(new AppError(`No resume found with ID: ${id}`, 404));
  }

  if (resume.status === 'failed') {
    return next(
      new AppError('This resume failed to process and cannot be analyzed.', 422)
    );
  }

  if (!resume.extractedText || resume.extractedText.trim().length < 50) {
    return next(
      new AppError('Resume has insufficient text content for analysis.', 422)
    );
  }

  // Optionally accept a job description for targeted analysis
  const { jobDescription } = req.body;

  const analysisResult = await analyzeResume(resume.extractedText, {
    jobDescription,
  });

  const updated = await Resume.findByIdAndUpdate(
    id,
    { analysisResult, status: 'analyzed' },
    { new: true }
  );

  logger.info(`Resume analyzed: ${id} | Score: ${analysisResult.overallScore}`);

  res.status(200).json({
    status: 'success',
    message: 'Resume analyzed successfully.',
    data: {
      resume: sanitizeResume(updated),
      analysis: analysisResult,
    },
  });
});

// ─── Get All ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/resumes
 * Returns paginated list of all resumes (without extracted text for performance).
 */
const getAllResumes = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
  const skip = (page - 1) * limit;

  const [resumes, total] = await Promise.all([
    Resume.find()
      .select('-extractedText') // exclude large field from list view
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Resume.countDocuments(),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      resumes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// ─── Get One ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/resumes/:id
 * Returns full resume document including extracted text and analysis.
 */
const getResumeById = asyncHandler(async (req, res, next) => {
  const resume = await Resume.findById(req.params.id).lean();

  if (!resume) {
    return next(new AppError(`No resume found with ID: ${req.params.id}`, 404));
  }

  res.status(200).json({
    status: 'success',
    data: { resume },
  });
});

// ─── Delete ───────────────────────────────────────────────────────────────────────

/**
 * DELETE /api/resumes/:id
 * Deletes the MongoDB record and the file from disk.
 */
const deleteResume = asyncHandler(async (req, res, next) => {
  const resume = await Resume.findByIdAndDelete(req.params.id);

  if (!resume) {
    return next(new AppError(`No resume found with ID: ${req.params.id}`, 404));
  }

  // Clean up uploaded file from disk
  if (resume.filePath && fs.existsSync(resume.filePath)) {
    fs.unlink(resume.filePath, (err) => {
      if (err) logger.warn(`Could not delete file: ${resume.filePath} — ${err.message}`);
    });
  }

  logger.info(`Resume deleted: ${req.params.id}`);

  res.status(204).send();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────────

/**
 * Remove the full file path from API responses for security.
 */
const sanitizeResume = (resume) => {
  const obj = resume.toObject ? resume.toObject() : { ...resume };
  delete obj.filePath;
  return obj;
};

export {
  uploadResume,
  analyzeResumeById,
  getAllResumes,
  getResumeById,
  deleteResume,
};
