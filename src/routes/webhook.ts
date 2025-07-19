// WhatsApp webhook route: receives messages, searches Pinecone for FAQs, and replies
import { Router } from 'express';
import { searchSimilarFAQs } from '../services/pinecone.js';
import { sendWhatsAppMessageWithRetry } from '../services/whatsapp.js';
import { storeChatMessage } from '../services/supabase.js';
import { answerWithRAG } from '../services/gemini.js';

const router = Router();

// Track processed message IDs to prevent duplicates
const processedMessages = new Set<string>();

router.post('/', async (req, res) => {
  console.log('--- Incoming webhook ---');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  // 360dialog/WhatsApp payload: entry[0].changes[0].value.messages[0]
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) {
    console.log('No message found in webhook payload.');
    return res.sendStatus(200);
  }
  
  // Check if we've already processed this message
  const messageId = message.id;
  if (processedMessages.has(messageId)) {
    console.log(`Message ${messageId} already processed, skipping.`);
    return res.sendStatus(200);
  }
  
  // Add to processed set (with cleanup after 1 hour)
  processedMessages.add(messageId);
  setTimeout(() => processedMessages.delete(messageId), 60 * 60 * 1000);
  
  console.log('Extracted message:', JSON.stringify(message, null, 2));

  const from = message.from;
  const userMessage = message.text?.body;
  
  if (!userMessage) {
    console.log('No text content in message');
    return res.sendStatus(200);
  }

  try {
    console.log(`📱 Processing message from ${from}: "${userMessage}"`);
    
    // 1. Get top-5 FAQ candidates from Pinecone
    const faqCandidates = await searchSimilarFAQs(userMessage, from, 5);
    
    // 2. Build RAG prompt and get Gemini's answer
    const botResponse = await answerWithRAG(userMessage, faqCandidates, from);
    
    // 3. Send response via WhatsApp
    console.log(`📤 Sending response to ${from}: "${botResponse}"`);
    await sendWhatsAppMessageWithRetry(from, botResponse);
    
    // 4. Store chat message in Supabase for history tracking
    console.log('💾 Storing chat message in database...');
    await storeChatMessage(from, userMessage, botResponse);
    
    console.log('✅ Message processed successfully');

  } catch (error) {
    console.error('❌ Error processing message:', error);
    // Send fallback message
    await sendWhatsAppMessageWithRetry(from, 'Maaf, sedang ada gangguan teknis. Silakan coba lagi nanti.');
  }

  // Always return 200 to acknowledge receipt
  res.sendStatus(200);
});

export default router; 