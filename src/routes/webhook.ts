// WhatsApp webhook route: receives messages, processes with LLM, and replies via 360dialog
import { Router } from 'express';
import { getGeminiResponse, isDoctorInquiry } from '../services/gemini.js';
import { sendWhatsAppMessageWithRetry } from '../services/whatsapp.js';
import { storeReview } from '../services/supabase.js';
import { delay, extractMessageType, generateRandomDoctorName, generateRandomTime } from '../utils/helpers.js';

const router = Router();

// Track processed message IDs to prevent duplicates
const processedMessages = new Set<string>();

// Track user states for registration flow
const userStates = new Map<string, {
  waitingForReview: boolean;
  registrationCompleted: boolean;
}>();

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

  // Get user state
  const userState = userStates.get(from) || {
    waitingForReview: false,
    registrationCompleted: false
  };

  try {
    // Handle different message types
    const messageType = extractMessageType(userMessage);
    console.log(`Message type: ${messageType}`);

    if (userState.waitingForReview) {
      // User is providing a review
      console.log('Processing review from user');
      await handleReview(from, userMessage);
      userState.waitingForReview = false;
      userStates.set(from, userState);
    } else if (messageType === 'doctor_inquiry' || isDoctorInquiry(userMessage)) {
      // Handle doctor inquiry
      console.log('Processing doctor inquiry');
      await handleDoctorInquiry(from, userMessage);
    } else if (messageType === 'review') {
      // Direct review submission
      console.log('Processing direct review');
      await handleReview(from, userMessage);
    } else {
      // General message - get Gemini response
      console.log('Processing general message');
      await handleGeneralMessage(from, userMessage);
    }

  } catch (error) {
    console.error('Error processing message:', error);
    // Send fallback message
    await sendWhatsAppMessageWithRetry(from, 'Maaf, sedang ada gangguan. Silakan coba lagi nanti.');
  }

  // Always return 200 to acknowledge receipt
  res.sendStatus(200);
});

async function handleDoctorInquiry(from: string, userMessage: string) {
  // Get Gemini response for doctor inquiry
  const geminiResponse = await getGeminiResponse(userMessage, 'doctor_inquiry');
  
  // Send initial response
  await sendWhatsAppMessageWithRetry(from, geminiResponse.text);
  
  // Start registration simulation after 15 seconds
  setTimeout(async () => {
    await simulateRegistration(from);
  }, 15000);
}

async function handleGeneralMessage(from: string, userMessage: string) {
  // Get Gemini response for general message
  const geminiResponse = await getGeminiResponse(userMessage, 'general');
  
  // Send response
  await sendWhatsAppMessageWithRetry(from, geminiResponse.text);
}

async function handleReview(from: string, reviewText: string) {
  // Store review in Supabase
  const storedReview = await storeReview(from, reviewText);
  
  if (storedReview) {
    await sendWhatsAppMessageWithRetry(
      from, 
      'Terima kasih atas review Anda! Feedback ini sangat berharga untuk meningkatkan pelayanan kami. 🙏'
    );
  } else {
    await sendWhatsAppMessageWithRetry(
      from, 
      'Maaf, ada masalah teknis saat menyimpan review Anda. Silakan coba lagi nanti.'
    );
  }
}

async function simulateRegistration(from: string) {
  const doctorName = generateRandomDoctorName();
  const appointmentTime = generateRandomTime();
  
  // Send registration success message
  const registrationMessage = `Registrasi berhasil untuk kontrol dengan ${doctorName} jam ${appointmentTime}.`;
  await sendWhatsAppMessageWithRetry(from, registrationMessage);
  
  // Update user state
  const userState = userStates.get(from) || {
    waitingForReview: false,
    registrationCompleted: false
  };
  userState.registrationCompleted = true;
  userStates.set(from, userState);
  
  // Wait 5 seconds then ask for feedback
  await delay(5000);
  
  const feedbackMessage = 'Silakan isi review pelayanan kami.';
  await sendWhatsAppMessageWithRetry(from, feedbackMessage);
  
  // Set user state to waiting for review
  userState.waitingForReview = true;
  userStates.set(from, userState);
}

export default router; 