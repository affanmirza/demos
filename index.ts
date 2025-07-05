// Step-by-step outline to connect WhatsApp (360dialog) to a custom webhook
// that processes user messages and responds using an LLM.

// We'll use Node.js (Express) for simplicity, but can adapt to Python, Go, etc.

/**
 * 1. Setup: Create a simple Express server with a POST /webhook endpoint
 */

import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import webhookRouter from './src/routes/webhook.ts';
import { loadEnv } from './src/config/env.ts';

loadEnv();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use('/webhook', webhookRouter);

/**
 * 2. Webhook Endpoint: Receives WhatsApp messages
 */
app.post('/webhook', async (req, res) => {
  const message = req.body.messages?.[0];

  if (!message) {
    return res.sendStatus(200); // acknowledge receipt
  }

  const from = message.from; // e.g., "628123456789"
  const userMessage = message.text?.body;

  // Process with Gemini LLM
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
  } catch (e) {
    console.error('LLM Error:', e);
    reply = 'Maaf, sedang ada gangguan. Silakan coba lagi nanti.';
  }

  // Send message back using WhatsApp API
  try {
    await axios.post(
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
  } catch (e) {
    console.error('Sending error:', e);
  }

  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send('WhatsApp LLM Webhook is running.');
});

/**
 * 3. Start server
 */
app.listen(port, () => {
  console.log(`Webhook server running at http://localhost:${port}`);
});

/**
 * 4. Setup tunneling for local testing (use ngrok or Cloudflare Tunnel)
 * Example: ngrok http 3000
 *
 * 5. Register webhook with 360dialog:
 * curl --request POST \
 *   --url https://waba-sandbox.360dialog.io/v1/configs/webhook \
 *   --header 'D360-API-KEY: YOUR_SANDBOX_KEY' \
 *   --header 'Content-Type: application/json' \
 *   --data '{"url": "https://<your-ngrok-url>/webhook"}'
 *
 * 6. Environment Variables needed:
 * - GEMINI_API_KEY: Your Google AI Studio API key
 * - DIALOG360_API_KEY: Your 360dialog WhatsApp API key
 */
