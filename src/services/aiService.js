import logger from "../utils/logger.js";

// ═══════════════════════════════════════════════════════════════════════════════
// AI PROVIDER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const AI_PROVIDER = process.env.AI_PROVIDER || "gemini";

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE GEMINI (Using @google/generative-ai SDK for free Gemini API)
// ═══════════════════════════════════════════════════════════════════════════════

const analyzeWithGemini = async (resumeText) => {
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment variables");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    });

    const prompt = `You are an expert resume reviewer. Analyze this resume and provide feedback in JSON format.

Resume:
${resumeText}

Return ONLY valid JSON (no markdown) with this structure:
{
  "overallScore": <number 0-100>,
  "experienceLevel": "<entry|mid|senior|executive>",
  "strengths": ["strength 1", "strength 2", "..."],
  "weaknesses": ["weakness 1", "weakness 2", "..."],
  "suggestions": ["suggestion 1", "suggestion 2", "..."],
  "keywords": ["keyword 1", "keyword 2", "..."],
  "sections": {
    "hasContact": <boolean>,
    "hasSummary": <boolean>,
    "hasExperience": <boolean>,
    "hasEducation": <boolean>,
    "hasSkills": <boolean>
  }
}

Scoring: 90-100 exceptional, 80-89 excellent, 70-79 good, 60-69 fair, below 60 needs work.`;

    logger.debug("Sending request to Gemini...");
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    logger.debug("Received Gemini response");

    // Clean response
    let cleaned = text
      .trim()
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const analysis = JSON.parse(cleaned);

    if (!analysis.overallScore || !analysis.experienceLevel) {
      throw new Error("Invalid response structure");
    }

    return analysis;
  } catch (error) {
    logger.error(`Gemini error: ${error.message}`);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GROQ (Fast inference with Llama)
// ═══════════════════════════════════════════════════════════════════════════════

const analyzeWithGroq = async (resumeText) => {
  try {
    const Groq = (await import("groq-sdk")).default;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY not found");
    }

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an expert resume reviewer. Respond ONLY with valid JSON.",
        },
        {
          role: "user",
          content: `Analyze this resume. Return JSON with: overallScore (0-100), experienceLevel (entry/mid/senior/executive), strengths (array), weaknesses (array), suggestions (array), keywords (array), sections (object with hasContact, hasSummary, hasExperience, hasEducation, hasSkills booleans).\n\nResume:\n${resumeText}`,
        },
      ],
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 2000,
    });

    const text = completion.choices[0].message.content;
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    return JSON.parse(cleaned);
  } catch (error) {
    logger.error(`Groq error: ${error.message}`);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// OLLAMA (Local, private)
// ═══════════════════════════════════════════════════════════════════════════════

const analyzeWithOllama = async (resumeText) => {
  try {
    const { Ollama } = await import("ollama");

    const ollama = new Ollama({
      host: process.env.OLLAMA_HOST || "http://localhost:11434",
    });

    const response = await ollama.chat({
      model: process.env.OLLAMA_MODEL || "llama3.1",
      messages: [
        {
          role: "system",
          content: "You are an expert resume reviewer. Respond ONLY with JSON.",
        },
        {
          role: "user",
          content: `Analyze resume. Return JSON with: overallScore (0-100), experienceLevel (entry/mid/senior/executive), strengths, weaknesses, suggestions, keywords (arrays), sections (object with hasContact, hasSummary, hasExperience, hasEducation, hasSkills).\n\n${resumeText}`,
        },
      ],
      options: { temperature: 0.3, num_predict: 2000 },
      stream: false,
    });

    const cleaned = response.message.content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    return JSON.parse(cleaned);
  } catch (error) {
    logger.error(`Ollama error: ${error.message}`);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK (No API key needed)
// ═══════════════════════════════════════════════════════════════════════════════

const analyzeWithMock = async (resumeText) => {
  await new Promise((r) => setTimeout(r, 500));

  const TECH_KW = [
    "javascript",
    "python",
    "java",
    "react",
    "node",
    "sql",
    "aws",
    "docker",
    "git",
  ];
  const SOFT_KW = [
    "leadership",
    "communication",
    "teamwork",
    "problem-solving",
  ];

  const lower = resumeText.toLowerCase();
  const keywords = [...TECH_KW, ...SOFT_KW].filter((k) => lower.includes(k));

  const sections = {
    hasContact: /email|phone|@|\+/i.test(resumeText),
    hasSummary: /summary|objective|profile/i.test(resumeText),
    hasExperience: /experience|employment|work history/i.test(resumeText),
    hasEducation: /education|degree|university|bachelor/i.test(resumeText),
    hasSkills: /skills|technologies|competencies/i.test(resumeText),
  };

  const wordCount = resumeText.split(/\s+/).length;
  let score = 0;

  score += sections.hasContact ? 8 : 0;
  score += sections.hasSummary ? 8 : 0;
  score += sections.hasExperience ? 10 : 0;
  score += sections.hasEducation ? 7 : 0;
  score += sections.hasSkills ? 7 : 0;
  score += Math.min(30, keywords.length * 3);
  score += wordCount >= 300 && wordCount <= 900 ? 30 : 15;

  const strengths = [];
  const weaknesses = [];
  const suggestions = [];

  if (sections.hasContact) strengths.push("Contact information present");
  else weaknesses.push("Missing contact info");

  if (sections.hasExperience) strengths.push("Work experience documented");
  else suggestions.push("Add work experience section");

  if (keywords.length >= 5)
    strengths.push(`${keywords.length} relevant keywords found`);
  else suggestions.push("Add more industry keywords");

  return {
    overallScore: Math.min(100, score),
    experienceLevel: /senior|lead/i.test(lower)
      ? "senior"
      : /entry|junior/i.test(lower)
        ? "entry"
        : "mid",
    strengths,
    weaknesses,
    suggestions,
    keywords: [...new Set(keywords)],
    sections,
    analyzedAt: new Date(),
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

const analyzeResume = async (resumeText, options = {}) => {
  logger.info(`Analyzing with: ${AI_PROVIDER}`);

  try {
    let result;

    switch (AI_PROVIDER.toLowerCase()) {
      case "gemini":
        result = await analyzeWithGemini(resumeText);
        break;
      case "groq":
        result = await analyzeWithGroq(resumeText);
        break;
      case "ollama":
        result = await analyzeWithOllama(resumeText);
        break;
      case "mock":
      default:
        result = await analyzeWithMock(resumeText);
        break;
    }

    if (!result.analyzedAt) result.analyzedAt = new Date();

    logger.info(`Analysis done. Score: ${result.overallScore}`);
    return result;
  } catch (error) {
    logger.error(`${AI_PROVIDER} failed: ${error.message}`);

    if (AI_PROVIDER !== "mock") {
      logger.warn("Falling back to mock");
      return await analyzeWithMock(resumeText);
    }

    throw error;
  }
};

export { analyzeResume };
