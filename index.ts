// Hospital Chatbot Demo with WhatsApp, Gemini, and Supabase
import express from 'express';
import bodyParser from 'body-parser';
import webhookRouter from './src/routes/webhook.ts';
import { loadEnv } from './src/config/env.ts';
import { initializeDatabase, seedSampleReviews, getReviews } from './src/services/supabase.js';
import { initializePinecone, seedSampleFAQs } from './src/services/pinecone.js';

loadEnv();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use('/webhook', webhookRouter);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Hospital Chatbot Webhook is running',
    endpoints: {
      webhook: '/webhook',
      reviews: '/reviews',
      seed: '/seed'
    }
  });
});

// View all reviews
app.get('/reviews', async (req, res) => {
  try {
    const reviews = await getReviews();
    res.json({
      success: true,
      count: reviews.length,
      reviews: reviews
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews'
    });
  }
});

// Seed sample reviews
app.post('/seed', async (req, res) => {
  try {
    await seedSampleReviews();
    res.json({
      success: true,
      message: 'Sample reviews seeded successfully'
    });
  } catch (error) {
    console.error('Error seeding reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed reviews'
    });
  }
});

// Seed sample FAQs
app.post('/seed-faqs', async (req, res) => {
  try {
    await seedSampleFAQs();
    res.json({
      success: true,
      message: 'Sample FAQs seeded successfully'
    });
  } catch (error) {
    console.error('Error seeding FAQs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed FAQs'
    });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    
    console.log('Initializing Pinecone...');
    await initializePinecone();
    
    app.listen(port, () => {
      console.log(`🚀 Hospital Chatbot server running at http://localhost:${port}`);
      console.log(`📱 Webhook endpoint: http://localhost:${port}/webhook`);
      console.log(`📊 View reviews: http://localhost:${port}/reviews`);
      console.log(`🌱 Seed data: POST http://localhost:${port}/seed`);
      console.log(`🧠 Seed FAQs: POST http://localhost:${port}/seed-faqs`);
      console.log('');
      console.log('📋 Setup Instructions:');
      console.log('1. Use ngrok: ngrok http 3000');
      console.log('2. Register webhook with 360dialog using your ngrok URL');
      console.log('3. Create Supabase table: reviews (id, wa_id, review, timestamp)');
      console.log('4. Seed FAQs: POST http://localhost:3000/seed-faqs');
      console.log('5. Test with WhatsApp message!');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
