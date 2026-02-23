import 'dotenv/config';

const testGroq = async () => {
  console.log('\n🧪 Testing Groq API...\n');
  
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  
  if (!apiKey) {
    console.error('❌ GROQ_API_KEY not found');
    process.exit(1);
  }
  
  console.log('✓ GROQ_API_KEY found');
  console.log(`✓ Using model: ${model}\n`);
  
  try {
    const Groq = (await import('groq-sdk')).default;
    const groq = new Groq({ apiKey });
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Say hello in JSON format' }],
      model,
      temperature: 0.3,
      max_tokens: 100,
    });
    
    console.log('✅ SUCCESS! Groq API is working!\n');
    console.log('📊 Response:', completion.choices[0].message.content.substring(0, 100));
    console.log('\n🎉 Ready to use Groq!\n');
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    process.exit(1);
  }
};

testGroq();
