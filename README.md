# 🧠 AI Resume Analyzer — Node.js + Express REST API

A production-ready backend for analyzing PDF resumes using text extraction and AI scoring.

---

## ✨ Features

- **PDF Upload** — Multipart form-data upload with type and size validation
- **Text Extraction** — Parses PDF content using `pdf-parse`
- **MongoDB Persistence** — Stores resume metadata, extracted text, and analysis
- **AI Analysis** — Mock analysis engine (scoring, keywords, section detection) with clear swap-in points for OpenAI/Gemini
- **MVC Architecture** — Clean separation of concerns across Models, Views (responses), Controllers
- **Security** — Helmet, CORS, rate limiting, input sanitization
- **Error Handling** — Centralized global error handler with operational vs. programmer error classification
- **Logging** — Winston-powered structured logging (console + file)
- **Graceful Shutdown** — Handles `SIGTERM`/`SIGINT` cleanly
- **Tests** — Jest + Supertest integration test suite

---

## 📁 Project Structure

```
ai-resume-analyzer/
├── src/
│   ├── config/
│   │   ├── database.js        # MongoDB connection with reconnect handling
│   │   └── multer.js          # File upload configuration
│   ├── controllers/
│   │   └── resumeController.js # MVC controllers for all resume operations
│   ├── middleware/
│   │   ├── errorHandler.js    # Global error handler
│   │   └── validateMongoId.js # ObjectId validation middleware
│   ├── models/
│   │   └── Resume.js          # Mongoose schema + model
│   ├── routes/
│   │   ├── healthRoutes.js    # Health check endpoint
│   │   └── resumeRoutes.js    # Resume CRUD + analyze routes
│   ├── services/
│   │   ├── aiService.js       # Mock AI analysis (swap-in ready for real AI)
│   │   └── pdfService.js      # PDF text extraction logic
│   ├── utils/
│   │   ├── AppError.js        # Custom operational error class
│   │   ├── asyncHandler.js    # Async wrapper to eliminate try/catch
│   │   └── logger.js          # Winston logger
│   ├── app.js                 # Express app (middleware + routes)
│   └── server.js              # Entry point (DB connect + server start)
├── tests/
│   └── resume.test.js         # Integration test suite
├── uploads/                   # Uploaded PDFs (gitignored)
├── logs/                      # Log files (auto-created)
├── .env.example
├── .gitignore
├── jest.config.json
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)

### 1. Clone & Install

```bash
git clone <repo-url>
cd ai-resume-analyzer
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/resume_analyzer
MAX_FILE_SIZE_MB=5
```

### 3. Run

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

Server starts at: `http://localhost:5000`

### 4. Run Tests

```bash
npm test
```

---

## 📡 API Reference

### Health Check

```
GET /api/health
```

**Response:**
```json
{
  "status": "success",
  "environment": "development",
  "uptime": "42s",
  "database": "connected"
}
```

---

### Upload Resume

```
POST /api/resumes/upload
Content-Type: multipart/form-data
Field: resume (PDF file, max 5MB)
```

```bash
curl -X POST http://localhost:5000/api/resumes/upload \
  -F "resume=@/path/to/your/resume.pdf"
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Resume uploaded and text extracted successfully.",
  "data": {
    "resume": {
      "_id": "66a1234abc...",
      "originalName": "john-doe-resume.pdf",
      "status": "processed",
      "wordCount": 487,
      "pageCount": 1
    }
  }
}
```

---

### Analyze Resume

```
POST /api/resumes/:id/analyze
Content-Type: application/json
Body (optional): { "jobDescription": "Looking for a senior Node.js developer..." }
```

```bash
curl -X POST http://localhost:5000/api/resumes/66a1234abc/analyze \
  -H "Content-Type: application/json" \
  -d '{"jobDescription": "React and Node.js engineer"}'
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "analysis": {
      "overallScore": 82,
      "experienceLevel": "senior",
      "strengths": ["Contact information present", "Strong keyword density"],
      "weaknesses": [],
      "suggestions": ["Add a professional summary"],
      "keywords": ["javascript", "react", "node", "docker", "aws"],
      "sections": {
        "hasContact": true,
        "hasSummary": false,
        "hasExperience": true,
        "hasEducation": true,
        "hasSkills": true
      }
    }
  }
}
```

---

### List All Resumes

```
GET /api/resumes?page=1&limit=10
```

---

### Get Single Resume

```
GET /api/resumes/:id
```

---

### Delete Resume

```
DELETE /api/resumes/:id
```

---

## 🤖 Integrating Real AI

The `aiService.js` file is designed with a clear swap-in point. To connect OpenAI:

```bash
npm install openai
```

Replace the body of `analyzeResume()` in `src/services/aiService.js`:

```js
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.AI_API_KEY });

const analyzeResume = async (resumeText, options = {}) => {
  const completion = await client.chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are an expert resume reviewer. Return JSON only.',
      },
      {
        role: 'user',
        content: `Analyze this resume and return JSON with keys:
          overallScore (0-100), strengths (array), weaknesses (array),
          suggestions (array), keywords (array), experienceLevel (entry/mid/senior/executive).\n\n${resumeText}`,
      },
    ],
    response_format: { type: 'json_object' },
  });
  return JSON.parse(completion.choices[0].message.content);
};
```

---

## 🔒 Security Considerations for Production

- Set `CORS_ORIGIN` to your frontend domain (not `*`)
- Use MongoDB Atlas with auth credentials in `MONGODB_URI`
- Store uploaded files in S3/GCS instead of local disk
- Add authentication middleware (JWT) before protected routes
- Enable HTTPS via a reverse proxy (nginx/Caddy)
