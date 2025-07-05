// WhatsApp webhook route: receives messages, processes with LLM, and replies via 360dialog
import { Router } from 'express';
import axios from 'axios';

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
  const prompt = `
You are a hospital admin chatbot assistant.
Your role is to answer patients' general questions about doctor availability and specialties. 
Keep answers short, helpful, and friendly. Do NOT provide medical diagnosis or treatment plans.
If unsure, say "Silakan hubungi bagian administrasi rumah sakit untuk informasi lebih lanjut."
Patient asks: ${userMessage}
Answer:`;

  let reply;
  try {
    const completion = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `You are a helpful assistant for a hospital admin chatbot. ${prompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    reply = completion.data.candidates[0].content.parts[0].text;
    console.log('Gemini API response:', reply);
  } catch (e) {
    const err: any = e;
    console.error('LLM Error:', err?.response?.data || err?.message || err);
    reply = 'Maaf, sedang ada gangguan. Silakan coba lagi nanti.';
  }

  // Send message back via 360dialog
  let sendSuccess = false;
  try {
    console.log(`Attempting to send message to ${from}:`, reply);
    console.log('Using DIALOG360_API_KEY:', process.env.DIALOG360_API_KEY ? 'Present' : 'Missing');
    
    const sendResult = await axios.post(
      'https://waba-sandbox.360dialog.io/v1/messages',
      {
        messaging_product: 'whatsapp',
        to: from,
        type: 'text',
        text: { body: reply }
      },
      {
        headers: {
          'D360-API-KEY': process.env.DIALOG360_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('360dialog send message response:', sendResult.data);
    sendSuccess = true;
  } catch (e) {
    const err: any = e;
    console.error('Sending error details:');
    console.error('Status:', err?.response?.status);
    console.error('Status Text:', err?.response?.statusText);
    console.error('Response Data:', err?.response?.data);
    console.error('Error Message:', err?.message);
    // If sending fails, we should still return 200 to prevent webhook retries
    // but log the error for debugging
  }

  // Always return 200 to acknowledge receipt, regardless of send success
  // This prevents WhatsApp from retrying the webhook
  res.sendStatus(200);
});

export default router; 