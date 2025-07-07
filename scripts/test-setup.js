// Test script to verify all services are working
import dotenv from 'dotenv';
import { loadEnv } from '../src/config/env.js';
import { getGeminiResponse } from '../src/services/gemini.js';
import { sendWhatsAppMessage } from '../src/services/whatsapp.js';
import { storeReview, getReviews } from '../src/services/supabase.js';
import { initializePinecone, searchSimilarFAQs, storeFAQ } from '../src/services/pinecone.js';

dotenv.config();
loadEnv();

async function testGemini() {
  console.log('🧠 Testing Gemini API...');
  try {
    const response = await getGeminiResponse('Halo, apa kabar?');
    console.log('✅ Gemini test successful:', response.text.substring(0, 50) + '...');
    return true;
  } catch (error) {
    console.error('❌ Gemini test failed:', error.message);
    return false;
  }
}

async function testWhatsApp() {
  console.log('📱 Testing WhatsApp API...');
  try {
    // Test with a dummy number (won't actually send)
    const success = await sendWhatsAppMessage('628123456789', 'Test message');
    if (success) {
      console.log('✅ WhatsApp API test successful');
      return true;
    } else {
      console.log('❌ WhatsApp API test failed - check your API key');
      return false;
    }
  } catch (error) {
    console.error('❌ WhatsApp test failed:', error.message);
    return false;
  }
}

async function testSupabase() {
  console.log('🗄️ Testing Supabase...');
  try {
    // Test storing a review
    const testReview = await storeReview('628123456789', 'Test review from setup script');
    if (testReview) {
      console.log('✅ Supabase write test successful');
      
      // Test reading reviews
      const reviews = await getReviews();
      console.log(`✅ Supabase read test successful - found ${reviews.length} reviews`);
      return true;
    } else {
      console.log('❌ Supabase test failed - check your credentials and table');
      return false;
    }
  } catch (error) {
    console.error('❌ Supabase test failed:', error.message);
    return false;
  }
}

async function testPinecone() {
  console.log('🧠 Testing Pinecone...');
  try {
    // Initialize Pinecone
    await initializePinecone();
    
    // Test storing a FAQ
    const stored = await storeFAQ(
      'Test question about doctor schedule',
      'Test answer about doctor availability',
      'doctor_inquiry'
    );
    
    if (stored) {
      console.log('✅ Pinecone write test successful');
      
      // Test searching FAQs
      const results = await searchSimilarFAQs('doctor schedule', 'doctor_inquiry');
      console.log(`✅ Pinecone search test successful - found ${results.length} results`);
      return true;
    } else {
      console.log('❌ Pinecone test failed - check your API key and index');
      return false;
    }
  } catch (error) {
    console.error('❌ Pinecone test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Running setup tests...\n');
  
  const results = {
    gemini: await testGemini(),
    whatsapp: await testWhatsApp(),
    supabase: await testSupabase(),
    pinecone: await testPinecone()
  };
  
  console.log('\n📊 Test Results:');
  console.log(`Gemini: ${results.gemini ? '✅' : '❌'}`);
  console.log(`WhatsApp: ${results.whatsapp ? '✅' : '❌'}`);
  console.log(`Supabase: ${results.supabase ? '✅' : '❌'}`);
  console.log(`Pinecone: ${results.pinecone ? '✅' : '❌'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Your setup is ready.');
    console.log('You can now start the server with: npm start');
  } else {
    console.log('\n⚠️ Some tests failed. Please check your configuration:');
    if (!results.gemini) console.log('- Verify GEMINI_API_KEY in .env');
    if (!results.whatsapp) console.log('- Verify DIALOG360_API_KEY in .env');
    if (!results.supabase) console.log('- Verify SUPABASE_URL and SUPABASE_API_KEY in .env');
    if (!results.pinecone) console.log('- Verify PINECONE_API_KEY in .env');
    console.log('- Make sure the reviews table exists in Supabase');
  }
}

runTests().catch(console.error); 