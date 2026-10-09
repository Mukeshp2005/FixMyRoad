import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
import axios from 'axios';

const listModels = async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Testing key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
  try {
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.data && res.data.models) {
      console.log('\n--- Supported Gemini Models for your key ---');
      res.data.models.forEach((m) => {
        if (m.supportedGenerationMethods?.includes('generateContent')) {
          console.log(`- ${m.name.replace('models/', '')}`);
        }
      });
    }
  } catch (err) {
    console.error('Failed to list models:', err.response?.data || err.message);
  }
};

listModels();
