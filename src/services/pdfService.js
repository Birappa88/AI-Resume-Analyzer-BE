import fs from 'fs';
import pdfParse from 'pdf-parse';
import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';

/**
 * Extracts text content from a PDF file on disk.
 *
 * @param {string} filePath - Absolute path to the PDF file
 * @returns {Promise<{ text: string, pageCount: number, wordCount: number }>}
 */
const extractTextFromPDF = async (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new AppError('PDF file not found on disk.', 404);
  }

  let dataBuffer;
  try {
    dataBuffer = fs.readFileSync(filePath);
  } catch (err) {
    logger.error(`Failed to read PDF file: ${err.message}`);
    throw new AppError('Failed to read uploaded PDF file.', 500);
  }

  let parsed;
  try {
    parsed = await pdfParse(dataBuffer);
  } catch (err) {
    logger.error(`PDF parsing error: ${err.message}`);
    throw new AppError(
      'Failed to parse PDF. The file may be corrupted, encrypted, or unsupported.',
      422
    );
  }

  const text = (parsed.text || '').trim();

  if (!text || text.length < 50) {
    throw new AppError(
      'PDF appears to contain no extractable text. It may be a scanned image-only PDF. Please upload a text-based PDF.',
      422
    );
  }

  const wordCount = text
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  logger.debug(
    `Extracted ${text.length} chars, ${wordCount} words from ${parsed.numpages} pages`
  );

  return {
    text,
    pageCount: parsed.numpages || 0,
    wordCount,
  };
};

export { extractTextFromPDF };
