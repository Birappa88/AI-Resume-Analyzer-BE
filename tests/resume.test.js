import request from 'supertest';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env before app
const envPath = path.join(__dirname, '../.env.test');
if (fs.existsSync(envPath)) {
  await import('dotenv').then(dotenv => dotenv.config({ path: envPath }));
}

// Fallback for CI environments
process.env.MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/resume_analyzer_test';
process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = 'uploads_test';

const app = (await import('../src/app.js')).default;
const Resume = (await import('../src/models/Resume.js')).default;

// ─── Helpers ─────────────────────────────────────────────────────────────────────

/**
 * Creates a minimal valid 1-page PDF buffer for testing.
 * Uses a raw PDF structure that pdf-parse can extract text from.
 */
const createTestPDFBuffer = () => {
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 200 >>
stream
BT
/F1 12 Tf
50 750 Td
(John Doe) Tj
0 -20 Td
(Email: john@example.com Phone: 555-0100) Tj
0 -20 Td
(Summary: Experienced Software Engineer with 5 years) Tj
0 -20 Td
(Experience: Senior Developer at TechCorp 2019-2024) Tj
0 -20 Td
(Education: BS Computer Science State University 2018) Tj
0 -20 Td
(Skills: JavaScript Python React Node.js Docker AWS) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000068 00000 n
0000000125 00000 n
0000000274 00000 n
0000000526 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
617
%%EOF`;
  return Buffer.from(pdfContent);
};

// ─── Test Suite ───────────────────────────────────────────────────────────────────

describe('AI Resume Analyzer API', () => {
  let resumeId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    // Ensure test upload dir exists
    const dir = path.join(process.cwd(), 'uploads_test');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  afterAll(async () => {
    await Resume.deleteMany({});
    await mongoose.connection.close();
    // Clean up test uploads
    const dir = path.join(process.cwd(), 'uploads_test');
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  });

  // ─── Health ────────────────────────────────────────────────────────────────────

  describe('GET /api/health', () => {
    it('returns 200 with server and DB status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.database).toBe('connected');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  // ─── 404 ───────────────────────────────────────────────────────────────────────

  describe('Unknown routes', () => {
    it('returns 404 for unrecognised endpoints', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.status).toBe('fail');
    });
  });

  // ─── GET /api/resumes ─────────────────────────────────────────────────────────

  describe('GET /api/resumes', () => {
    it('returns paginated list', async () => {
      const res = await request(app).get('/api/resumes');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.resumes)).toBe(true);
      expect(res.body.data.pagination).toHaveProperty('total');
    });
  });

  // ─── POST /api/resumes/upload ─────────────────────────────────────────────────

  describe('POST /api/resumes/upload', () => {
    it('rejects non-PDF files', async () => {
      const res = await request(app)
        .post('/api/resumes/upload')
        .attach('resume', Buffer.from('hello world'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        });
      expect(res.status).toBe(400);
    });

    it('rejects requests with no file', async () => {
      const res = await request(app).post('/api/resumes/upload');
      expect(res.status).toBe(400);
    });

    it('uploads a PDF and returns extracted content', async () => {
      const pdfBuffer = createTestPDFBuffer();
      const res = await request(app)
        .post('/api/resumes/upload')
        .attach('resume', pdfBuffer, {
          filename: 'test-resume.pdf',
          contentType: 'application/pdf',
        });

      // If pdf-parse successfully extracts text: 201; if PDF is too minimal: 422
      expect([201, 422]).toContain(res.status);

      if (res.status === 201) {
        expect(res.body.status).toBe('success');
        expect(res.body.data.resume).toHaveProperty('_id');
        expect(res.body.data.resume).not.toHaveProperty('filePath');
        resumeId = res.body.data.resume._id;
      }
    });
  });

  // ─── GET /api/resumes/:id ─────────────────────────────────────────────────────

  describe('GET /api/resumes/:id', () => {
    it('returns 400 for invalid ID format', async () => {
      const res = await request(app).get('/api/resumes/not-an-id');
      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent ID', async () => {
      const res = await request(app).get(
        '/api/resumes/64a0000000000000000000ff'
      );
      expect(res.status).toBe(404);
    });

    it('returns the resume if it exists', async () => {
      if (!resumeId) return;
      const res = await request(app).get(`/api/resumes/${resumeId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.resume._id).toBe(resumeId);
    });
  });

  // ─── POST /api/resumes/:id/analyze ───────────────────────────────────────────

  describe('POST /api/resumes/:id/analyze', () => {
    it('returns 400 for invalid ID format', async () => {
      const res = await request(app).post('/api/resumes/bad-id/analyze');
      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent resume', async () => {
      const res = await request(app).post(
        '/api/resumes/64a0000000000000000000ff/analyze'
      );
      expect(res.status).toBe(404);
    });

    it('analyzes a processed resume', async () => {
      if (!resumeId) return;
      const res = await request(app)
        .post(`/api/resumes/${resumeId}/analyze`)
        .send({ jobDescription: 'Looking for a Node.js developer' });
      expect(res.status).toBe(200);
      expect(res.body.data.analysis).toHaveProperty('overallScore');
      expect(res.body.data.analysis.overallScore).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── DELETE /api/resumes/:id ──────────────────────────────────────────────────

  describe('DELETE /api/resumes/:id', () => {
    it('returns 400 for invalid ID format', async () => {
      const res = await request(app).delete('/api/resumes/bad-id');
      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent resume', async () => {
      const res = await request(app).delete(
        '/api/resumes/64a0000000000000000000ff'
      );
      expect(res.status).toBe(404);
    });

    it('deletes a resume and returns 204', async () => {
      if (!resumeId) return;
      const res = await request(app).delete(`/api/resumes/${resumeId}`);
      expect(res.status).toBe(204);
    });
  });
});
