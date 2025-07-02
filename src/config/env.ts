import dotenv from 'dotenv';

export function loadEnv() {
  dotenv.config();
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY in .env');
  }
  if (!process.env.DIALOG360_API_KEY) {
    throw new Error('Missing DIALOG360_API_KEY in .env');
  }
} 