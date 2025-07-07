import dotenv from 'dotenv';

export function loadEnv() {
  dotenv.config();
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY in .env');
  }
  if (!process.env.DIALOG360_API_KEY) {
    throw new Error('Missing DIALOG360_API_KEY in .env');
  }
  if (!process.env.SUPABASE_URL) {
    throw new Error('Missing SUPABASE_URL in .env');
  }
  if (!process.env.SUPABASE_API_KEY) {
    throw new Error('Missing SUPABASE_API_KEY in .env');
  }
  if (!process.env.PINECONE_API_KEY) {
    throw new Error('Missing PINECONE_API_KEY in .env');
  }
} 