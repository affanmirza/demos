import dotenv from 'dotenv';

export function loadEnv() {
  dotenv.config();
  
  // Required environment variables
  const requiredVars = [
    'PINECONE_API_KEY',
    'DIALOG360_API_KEY', 
    'SUPABASE_URL',
    'SUPABASE_API_KEY',
    'GEMINI_API_KEY'
  ];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing ${varName} in .env`);
    }
  }
  
  console.log('✅ All required environment variables loaded');
} 