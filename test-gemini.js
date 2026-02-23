#!/usr/bin/env node

/**
 * Gemini API Key Test Script
 *
 * This script tests if your Gemini API key is working correctly.
 * Run this BEFORE starting your server to verify your setup.
 *
 * Usage: node test-gemini.js
 */

import "dotenv/config";

const testGeminiAPIKey = async () => {
  console.log("\n🧪 Testing Gemini API Configuration...\n");

  // Check environment variables
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found in .env file");
    console.log("\n📝 Fix:");
    console.log("1. Create .env file: cp .env.example .env");
    console.log("2. Get API key: https://aistudio.google.com/app/apikey");
    console.log(
      "3. Add to .env: GEMINI_API_KEY=AIzaSyB9FqQx4YE43zlbo7R2fRtuP0HsIUwUvB0\n",
    );
    process.exit(1);
  }

  console.log("✓ GEMINI_API_KEY found");
  console.log(`✓ Using model: ${model}`);

  // Check if SDK is installed
  try {
    await import("@google/generative-ai");
    console.log("✓ @google/generative-ai SDK installed\n");
  } catch (err) {
    console.error("❌ @google/generative-ai SDK not installed");
    console.log("\n📝 Fix:");
    console.log("npm install @google/generative-ai\n");
    process.exit(1);
  }

  // Test API key
  console.log("🔄 Testing API key with Gemini...\n");

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelInstance = genAI.getGenerativeModel({ model });

    const result = await modelInstance.generateContent(
      'Say "Hello" in JSON format like {"message": "Hello"}',
    );
    const response = result.response;
    const text = response.text();

    console.log("✅ SUCCESS! Your Gemini API key is working!\n");
    console.log("📊 Test Response:", text.substring(0, 100) + "...\n");
    console.log("🎉 You're ready to use Gemini for resume analysis!\n");
  } catch (error) {
    console.error("❌ FAILED! Error testing Gemini API:\n");
    console.error(error.message);

    if (
      error.message.includes("API_KEY_INVALID") ||
      error.message.includes("invalid")
    ) {
      console.log("\n📝 Your API key is invalid. Fix:");
      console.log("1. Go to: https://aistudio.google.com/app/apikey");
      console.log("2. Create a NEW API key");
      console.log('3. Copy it (starts with "AIza")');
      console.log(
        "4. Update .env file: GEMINI_API_KEY=AIzaSyB9FqQx4YE43zlbo7R2fRtuP0HsIUwUvB0",
      );
    } else if (error.message.includes("model")) {
      console.log("\n📝 Model error. Fix:");
      console.log("Update .env: GEMINI_MODEL=gemini-2.5-flash");
    } else if (
      error.message.includes("quota") ||
      error.message.includes("exhausted")
    ) {
      console.log("\n📝 Rate limit reached. Fix:");
      console.log("Wait 1 minute and try again");
    } else {
      console.log("\n📝 Unknown error. Try:");
      console.log("1. Check internet connection");
      console.log("2. Verify API key is correct");
      console.log("3. Try model: gemini-2.5-flash");
    }

    console.log("\n💡 Alternative: Use Groq or Mock instead:");
    console.log("AI_PROVIDER=mock npm run dev\n");

    process.exit(1);
  }
};

// Run the test
testGeminiAPIKey().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
