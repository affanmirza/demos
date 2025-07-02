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

  // Process with OpenAI (or any LLM)
  const prompt = `Patient asks: ${userMessage}\nAnswer with helpful, simple and short response:`;

  let reply;
  try {
    const completion = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant for a hospital admin chatbot.' },
          { role: 'user', content: prompt }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    reply = completion.data.choices[0].message.content;
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
 */
