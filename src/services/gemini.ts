import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY must be set in environment variables');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export interface FAQContext {
  id: string;
  question: string;
  answer: string;
  score: number;
}

export interface GeminiResponse {
  selectedFAQId: string | null;
  confidence: number;
  reasoning: string;
  fallbackReason?: string;
}

// Multi-turn conversation context storage
const conversationContext: Map<string, {
  lastQuery: string;
  lastFAQId: string | null;
  timestamp: number;
}> = new Map();

const CONTEXT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function getConversationContext(phoneNumber: string): {
  lastQuery: string | null;
  lastFAQId: string | null;
} {
  const context = conversationContext.get(phoneNumber);
  if (!context) {
    return { lastQuery: null, lastFAQId: null };
  }
  
  // Check if context is still valid
  if (Date.now() - context.timestamp > CONTEXT_TIMEOUT) {
    conversationContext.delete(phoneNumber);
    return { lastQuery: null, lastFAQId: null };
  }
  
  return {
    lastQuery: context.lastQuery,
    lastFAQId: context.lastFAQId
  };
}

export function updateConversationContext(
  phoneNumber: string, 
  query: string, 
  faqId: string | null
): void {
  conversationContext.set(phoneNumber, {
    lastQuery: query,
    lastFAQId: faqId,
    timestamp: Date.now()
  });
}

export function clearConversationContext(phoneNumber: string): void {
  conversationContext.delete(phoneNumber);
}

// Preprocess user query for better understanding
export function preprocessQuery(query: string): string {
  return query
    .toLowerCase()
    // Replace common abbreviations and variations
    .replace(/\brs\b/g, "rumah sakit")
    .replace(/\bpoli\b/g, "poliklinik")
    .replace(/\bdr\b/g, "dokter")
    .replace(/\bjam\b/g, "jam")
    .replace(/\boperasional\b/g, "operasional")
    .replace(/\bbuka\b/g, "buka")
    .replace(/\bjadwal\b/g, "jadwal")
    .replace(/\bwaktu\b/g, "waktu")
    .replace(/\bdaftar\b/g, "daftar")
    .replace(/\bmendaftar\b/g, "mendaftar")
    .replace(/\bpendaftaran\b/g, "pendaftaran")
    .replace(/\blokasi\b/g, "lokasi")
    .replace(/\bdimana\b/g, "dimana")
    .replace(/\bdi mana\b/g, "dimana")
    .replace(/\bugd\b/g, "ugd")
    .replace(/\bdarurat\b/g, "darurat")
    .replace(/\bemergency\b/g, "darurat")
    .replace(/\bgawat darurat\b/g, "darurat")
    .replace(/\b24 jam\b/g, "24 jam")
    .replace(/\bdua puluh empat jam\b/g, "24 jam")
    // Remove punctuation but keep spaces
    .replace(/[^\w\s]/gi, ' ')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

export async function selectBestFAQ(
  userQuery: string,
  faqCandidates: FAQContext[],
  phoneNumber?: string
): Promise<GeminiResponse> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Get conversation context for multi-turn support
    const context = phoneNumber ? getConversationContext(phoneNumber) : { lastQuery: null, lastFAQId: null };
    
    // Build context-aware prompt
    let prompt = `Anda adalah asisten FAQ rumah sakit yang membantu pasien menemukan informasi yang tepat.

TUGAS: Pilih FAQ yang paling relevan dengan pertanyaan pengguna dari daftar yang diberikan.

PERTANYAAN PENGGUNA: "${userQuery}"

${context.lastQuery ? `KONTEKS PERCAKAPAN SEBELUMNYA:
- Pertanyaan sebelumnya: "${context.lastQuery}"
- FAQ yang dipilih: ${context.lastFAQId || 'tidak ada'}

Gunakan konteks ini untuk memahami pertanyaan lanjutan atau referensi.` : ''}

DAFTAR FAQ YANG TERSEDIA:
`;

    faqCandidates.forEach((faq, index) => {
      prompt += `${index + 1}. ID: ${faq.id}
   Pertanyaan: ${faq.question}
   Jawaban: ${faq.answer}
   Skor Similarity: ${faq.score.toFixed(3)}

`;
    });

    prompt += `
INSTRUKSI:
1. Analisis pertanyaan pengguna dengan cermat
2. Pertimbangkan konteks percakapan sebelumnya jika ada
3. Pilih FAQ yang paling sesuai dengan maksud pengguna
4. Jika tidak ada FAQ yang cocok, pilih "tidak ada yang cocok"

FORMAT JAWABAN (JSON):
{
  "selectedFAQId": "ID_FAQ_YANG_DIPILIH_ATAU_null",
  "confidence": 0.0-1.0,
  "reasoning": "Penjelasan mengapa FAQ ini dipilih",
  "fallbackReason": "Alasan jika tidak ada yang cocok (opsional)"
}

CONTOH:
- Jika pengguna bertanya "jam buka rumah sakit" → pilih FAQ tentang jam operasional
- Jika pengguna bertanya "ada ugd?" → pilih FAQ tentang layanan UGD
- Jika pengguna bertanya "terima bpjs?" → pilih FAQ tentang BPJS
- Jika pengguna bertanya "poli gigi" setelah bertanya "jam buka" → pilih FAQ tentang jam operasional (konteks poliklinik)

JAWABAN:`;

    console.log('🤖 Sending query to Gemini for FAQ selection...');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('🤖 Gemini response:', text);
    
    // Parse JSON response - handle markdown formatting
    try {
      // Remove markdown code blocks if present
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '');
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.replace(/\s*```$/, '');
      }
      
      const parsed = JSON.parse(jsonText);
      return {
        selectedFAQId: parsed.selectedFAQId || null,
        confidence: parsed.confidence || 0,
        reasoning: parsed.reasoning || 'No reasoning provided',
        fallbackReason: parsed.fallbackReason
      };
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response:', parseError);
      console.error('Raw response:', text);
      return {
        selectedFAQId: null,
        confidence: 0,
        reasoning: 'Failed to parse Gemini response',
        fallbackReason: 'JSON parsing error'
      };
    }
    
  } catch (error: any) {
    console.error('❌ Gemini API error:', error);
    return {
      selectedFAQId: null,
      confidence: 0,
      reasoning: 'Gemini API error',
      fallbackReason: error.message
    };
  }
}

export async function testGeminiConnection(): Promise<boolean> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent('Test connection');
    await result.response;
    
    console.log('✅ Gemini API connection successful');
    return true;
  } catch (error: any) {
    console.error('❌ Gemini API connection failed:', error);
    return false;
  }
} 