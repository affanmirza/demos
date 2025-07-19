// Test script for the new Gemini + Pinecone hybrid search approach
import { loadEnv } from './src/config/env.js';
import { searchSimilarFAQs, initializePinecone, preloadFAQs } from './src/services/pinecone.js';
import { testGeminiConnection } from './src/services/gemini.js';
import { testEmbeddingConnection } from './src/services/embeddings.js';

loadEnv();

async function testHybridSearch() {
  console.log('🧪 Testing Gemini + Pinecone Hybrid Search...\n');
  
  try {
    // Test connections
    console.log('🔤 Testing OpenAI embeddings...');
    const embeddingsHealthy = await testEmbeddingConnection();
    if (!embeddingsHealthy) {
      console.error('❌ OpenAI embeddings not available');
      return;
    }
    
    console.log('🤖 Testing Gemini connection...');
    const geminiHealthy = await testGeminiConnection();
    if (!geminiHealthy) {
      console.error('❌ Gemini API not available');
      return;
    }
    
    console.log('🧠 Initializing Pinecone...');
    const pineconeInitialized = await initializePinecone();
    if (!pineconeInitialized) {
      console.error('❌ Pinecone not initialized');
      return;
    }
    
    // Preload FAQs
    console.log('📚 Preloading FAQs...');
    await preloadFAQs();
    
    // Test queries
    const testQueries = [
      "ada ugd?",
      "apa terima bpjs?",
      "apakah hari ini buka?",
      "apa rs punya ugd",
      "jam buka poli gigi",
      "kalau poli anak?"
    ];
    
    console.log('\n🔍 Testing search queries...\n');
    
    for (const query of testQueries) {
      console.log(`📝 Testing: "${query}"`);
      console.log('─'.repeat(50));
      
      const results = await searchSimilarFAQs(query, '6281380434356');
      
      if (results.length > 0) {
        const result = results[0];
        console.log(`✅ MATCH: ${result.question}`);
        console.log(`📄 Answer: ${result.answer}`);
        console.log(`🎯 Score: ${result.score.toFixed(3)}`);
        console.log(`🔧 Source: ${result.source}`);
        if (result.reasoning) {
          console.log(`🤖 Reasoning: ${result.reasoning}`);
        }
      } else {
        console.log('❌ NO MATCH FOUND');
      }
      
      console.log('\n');
    }
    
    console.log('✅ Hybrid search test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testHybridSearch(); 