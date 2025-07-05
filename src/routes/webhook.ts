// WhatsApp webhook route: receives messages, processes with LLM, and replies via 360dialog
import { Router } from 'express';
import axios from 'axios';

const router = Router();

router.post('/', async (req, res) => {
  console.log('--- Incoming webhook ---');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  // 360dialog/WhatsApp payload: entry[0].changes[0].value.messages[0]
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) {
    console.log('No message found in webhook payload.');
    return res.sendStatus(200);
  }
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

  try {
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
  } catch (e) {
    const err: any = e;
    console.error('Sending error:', err?.response?.data || err?.message || err);
  }

  res.sendStatus(200);
});

export default router; 