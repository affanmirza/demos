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
 * Note: The actual webhook logic is handled in src/routes/webhook.ts
 */

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
