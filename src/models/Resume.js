import mongoose from 'mongoose';

const analysisResultSchema = new mongoose.Schema(
  {
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    suggestions: [{ type: String }],
    keywords: [{ type: String }],
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'executive', 'unknown'],
      default: 'unknown',
    },
    sections: {
      hasContact: { type: Boolean, default: false },
      hasSummary: { type: Boolean, default: false },
      hasExperience: { type: Boolean, default: false },
      hasEducation: { type: Boolean, default: false },
      hasSkills: { type: Boolean, default: false },
    },
    analyzedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      trim: true,
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
    },
    filePath: {
      type: String,
      required: [true, 'File path is required'],
    },
    fileSizeBytes: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    extractedText: {
      type: String,
      default: '',
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    pageCount: {
      type: Number,
      default: 0,
    },
    analysisResult: {
      type: analysisResultSchema,
      default: null,
    },
    status: {
      type: String,
      enum: ['uploaded', 'processed', 'analyzed', 'failed'],
      default: 'uploaded',
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: human-readable file size
resumeSchema.virtual('fileSizeKB').get(function () {
  return (this.fileSizeBytes / 1024).toFixed(2);
});

// Index for common queries
resumeSchema.index({ status: 1, createdAt: -1 });
resumeSchema.index({ createdAt: -1 });

const Resume = mongoose.model('Resume', resumeSchema);

export default Resume;
