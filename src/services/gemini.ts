import axios from 'axios';
import { searchSimilarFAQs, storeFAQ } from './pinecone.js';

export interface GeminiResponse {
  success: boolean;
  text: string;
  error?: string;
  source: 'pinecone' | 'gemini' | 'fallback';
}

export async function getGeminiResponse(userMessage: string, category?: 'doctor_inquiry' | 'general' | 'review'): Promise<GeminiResponse> {
  try {
    // First, search for similar FAQs in Pinecone
    console.log('🔍 Searching Pinecone for similar FAQs...');
    const similarFAQs = await searchSimilarFAQs(userMessage, category, 3);
    
    // If we found a good match (score > 0.8), use it
    if (similarFAQs.length > 0 && similarFAQs[0].score > 0.8) {
      const bestMatch = similarFAQs[0];
      console.log(`✅ Found similar FAQ in Pinecone (score: ${bestMatch.score.toFixed(3)})`);
      console.log(`Q: ${bestMatch.question}`);
      console.log(`A: ${bestMatch.answer}`);
      
      return {
        success: true,
        text: bestMatch.answer,
        source: 'pinecone'
      };
    }
    
    // If no good match found, call Gemini API
    console.log('🤖 No similar FAQ found, calling Gemini API...');
    const geminiResponse = await callGeminiAPI(userMessage);
    
    // Store the new Q&A pair in Pinecone for future use (don't block on failure)
    if (geminiResponse.success) {
      console.log('💾 Storing new FAQ in Pinecone...');
      try {
        await storeFAQ(userMessage, geminiResponse.text, category || 'general');
      } catch (error) {
        console.log('⚠️ Failed to store FAQ in Pinecone, but continuing...');
      }
    }
    
    return {
      ...geminiResponse,
      source: 'gemini'
    };
    
  } catch (error) {
    console.error('Error in getGeminiResponse:', error);
    
    // Fallback responses
    const fallbackResponses = [
      "Terima kasih atas pertanyaannya. Untuk informasi lebih detail, silakan hubungi bagian administrasi rumah sakit.",
      "Maaf, sedang ada gangguan teknis. Silakan coba lagi nanti atau hubungi kami langsung.",
      "Untuk pertanyaan tersebut, sebaiknya Anda menghubungi bagian administrasi rumah sakit untuk informasi yang lebih akurat."
    ];
    
    const randomFallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    
    return {
      success: false,
      text: randomFallback,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'fallback'
    };
  }
}

async function callGeminiAPI(userMessage: string): Promise<GeminiResponse> {
  const prompt = `
You are a hospital admin chatbot assistant.
Your role is to answer patients' general questions about doctor availability and specialties. 
Keep answers short, helpful, and friendly. Do NOT provide medical diagnosis or treatment plans.
If unsure, say "Silakan hubungi bagian administrasi rumah sakit untuk informasi lebih lanjut."

Patient asks: ${userMessage}
Answer:`;

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
        },
        timeout: 15000 // 15 second timeout
      }
    );

    const responseText = completion.data.candidates[0].content.parts[0].text;
    console.log('Gemini API response:', responseText);
    
    return {
      success: true,
      text: responseText,
      source: 'gemini'
    };
  } catch (error: any) {
    console.error('Gemini API Error:', error?.response?.data || error?.message || error);
    
    // Fallback responses for common scenarios
    const fallbackResponses = [
      "Terima kasih atas pertanyaannya. Untuk informasi lebih detail, silakan hubungi bagian administrasi rumah sakit.",
      "Maaf, sedang ada gangguan teknis. Silakan coba lagi nanti atau hubungi kami langsung.",
      "Untuk pertanyaan tersebut, sebaiknya Anda menghubungi bagian administrasi rumah sakit untuk informasi yang lebih akurat."
    ];
    
    const randomFallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    
    return {
      success: false,
      text: randomFallback,
      error: error?.response?.data?.error?.message || error?.message || 'Unknown error',
      source: 'fallback'
    };
  }
}

export function isDoctorInquiry(message: string): boolean {
  const doctorKeywords = [
    'dokter', 'doctor', 'jadwal', 'schedule', 'spesialis', 'specialist',
    'kontrol', 'checkup', 'appointment', 'janji', 'booking', 'reservasi',
    'gejala', 'symptom', 'sakit', 'pain', 'konsultasi', 'consultation'
  ];
  
  const lowerMessage = message.toLowerCase();
  return doctorKeywords.some(keyword => lowerMessage.includes(keyword));
} 