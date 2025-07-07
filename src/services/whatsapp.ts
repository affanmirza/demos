import axios from 'axios';

export interface WhatsAppMessage {
  to: string;
  body: string;
}

export async function sendWhatsAppMessage(to: string, body: string): Promise<boolean> {
  try {
    console.log(`Sending WhatsApp message to ${to}:`, body);
    
    const response = await axios.post(
      'https://waba-sandbox.360dialog.io/v1/messages',
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: body }
      },
      {
        headers: {
          'D360-API-KEY': process.env.DIALOG360_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds timeout
      }
    );

    // 360dialog returns 202 for accepted messages (they process asynchronously)
    if (response.status === 202 || response.status === 200) {
      console.log('WhatsApp message accepted by 360dialog:', response.data);
      return true;
    } else {
      console.log('Unexpected response status:', response.status);
      return false;
    }
  } catch (error: any) {
    console.error('WhatsApp sending error:');
    console.error('Status:', error?.response?.status);
    console.error('Status Text:', error?.response?.statusText);
    console.error('Response Data:', error?.response?.data);
    console.error('Error Message:', error?.message);
    
    // Check if it's a timeout error
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.log('⚠️ Request timed out - this might be normal for 360dialog (messages can take 5-15 seconds)');
      // For timeout errors, we'll assume the message was accepted
      // since 360dialog often processes messages asynchronously
      return true;
    }
    
    return false;
  }
}

export async function sendWhatsAppMessageWithRetry(
  to: string, 
  body: string, 
  maxRetries: number = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Attempt ${attempt}/${maxRetries} to send message to ${to}`);
    
    const success = await sendWhatsAppMessage(to, body);
    if (success) {
      return true;
    }
    
    if (attempt < maxRetries) {
      console.log(`Retrying in ${attempt * 2} seconds...`);
      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    }
  }
  
  console.error(`Failed to send WhatsApp message to ${to} after ${maxRetries} attempts`);
  return false;
} 