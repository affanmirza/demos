// Hospital FAQ Chatbot with WhatsApp, Pinecone, and Gemini Hybrid Search
import express from 'express';
import bodyParser from 'body-parser';
import webhookRouter from './src/routes/webhook.ts';
import { loadEnv } from './src/config/env.ts';
import { initializeDatabase, getAllChatHistory, getChatHistory } from './src/services/supabase.js';
import { initializePinecone, preloadFAQs } from './src/services/pinecone.js';
import { testGeminiConnection } from './src/services/gemini.js';
import { testEmbeddingConnection } from './src/services/embeddings.js';

loadEnv();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use('/webhook', webhookRouter);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Hospital FAQ Chatbot with Gemini + Pinecone Hybrid Search is running',
    endpoints: {
      webhook: '/webhook',
      chat_history: '/chat-history',
      chat_history_by_user: '/chat-history/:wa_id'
    }
  });
});

// View all chat history
app.get('/chat-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const chatHistory = await getAllChatHistory(limit);
    res.json({
      success: true,
      count: chatHistory.length,
      chat_history: chatHistory
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat history'
    });
  }
});

// View chat history for specific user
app.get('/chat-history/:wa_id', async (req, res) => {
  try {
    const waId = req.params.wa_id;
    const limit = parseInt(req.query.limit as string) || 10;
    const chatHistory = await getChatHistory(waId, limit);
    res.json({
      success: true,
      wa_id: waId,
      count: chatHistory.length,
      chat_history: chatHistory
    });
  } catch (error) {
    console.error('Error fetching user chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user chat history'
    });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('🚀 Starting Hospital FAQ Chatbot with Gemini + Pinecone Hybrid Search...');
    
    console.log('📊 Initializing database...');
    await initializeDatabase();
    
    console.log('🤖 Testing Gemini connection...');
    const geminiHealthy = await testGeminiConnection();
    if (geminiHealthy) {
      console.log('✅ Gemini API is connected');
    } else {
      console.log('⚠️ Gemini API not available - will use fallback methods');
    }
    
    console.log('🔤 Testing OpenAI embeddings...');
    const embeddingsHealthy = await testEmbeddingConnection();
    if (embeddingsHealthy) {
      console.log('✅ OpenAI embeddings are working');
    } else {
      console.log('⚠️ OpenAI embeddings not available - will use fallback methods');
    }
    
    console.log('🧠 Initializing Pinecone...');
    const pineconeInitialized = await initializePinecone();
    
    if (pineconeInitialized) {
      console.log('📚 Preloading FAQs into Pinecone...');
      await preloadFAQs();
    } else {
      console.log('⚠️ Pinecone not initialized - FAQ search will not work');
    }
    
    app.listen(port, () => {
      console.log(`✅ Hospital FAQ Chatbot server running at http://localhost:${port}`);
      console.log(`📱 Webhook endpoint: http://localhost:${port}/webhook`);
      console.log(`📊 View all chat history: http://localhost:${port}/chat-history`);
      console.log(`👤 View user chat history: http://localhost:${port}/chat-history/:wa_id`);
      console.log('');
      console.log('📋 Setup Instructions:');
      console.log('1. Use ngrok: ngrok http 3000');
      console.log('2. Register webhook with 360dialog using your ngrok URL');
      console.log('3. Create Supabase table: chat_history (id, wa_id, user_message, bot_response, timestamp)');
      console.log('4. Create Pinecone index: rs-bhayangkara-faq (1536 dimensions, cosine metric, text-embedding-3-small)');
      console.log('5. Set environment variables: GEMINI_API_KEY, OPENAI_API_KEY, PINECONE_API_KEY');
      console.log('6. Test with WhatsApp message!');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
