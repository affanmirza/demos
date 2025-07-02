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
    console.log('OpenAI API response:', reply);
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