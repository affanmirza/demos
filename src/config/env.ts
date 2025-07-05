import dotenv from 'dotenv';

export function loadEnv() {
  dotenv.config();
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY in .env');
  }
  if (!process.env.DIALOG360_API_KEY) {
    throw new Error('Missing DIALOG360_API_KEY in .env');
  }
} 