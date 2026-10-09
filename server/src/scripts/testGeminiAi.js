import dotenv from 'dotenv';
dotenv.config();

import { analyzeRoadImageWithAI } from '../services/aiService.js';

const runTest = async () => {
  console.log('--- Testing Gemini AI Verification Service ---');
  console.log('GEMINI_API_KEY present:', Boolean(process.env.GEMINI_API_KEY));

  // 1. Test Valid Road Defect Image (Sample Pothole Data URI)
  const samplePotholeDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  console.log('\n[Test 1] Testing Valid Complaint Analysis...');
  const validResult = await analyzeRoadImageWithAI(samplePotholeDataUri, 'Large deep pothole on main road causing traffic danger');
  console.log('Result:', JSON.stringify(validResult, null, 2));

  console.log('\n[Test 2] Testing Fake / Spurious Description Trigger...');
  const fakeResult = await analyzeRoadImageWithAI(samplePotholeDataUri, 'This is a test fake image selfie not a road');
  console.log('Result:', JSON.stringify(fakeResult, null, 2));
};

runTest();
