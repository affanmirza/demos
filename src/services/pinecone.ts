import { Pinecone } from '@pinecone-database/pinecone';
import { generateEmbedding } from './embeddings.js';
import { selectBestFAQ, preprocessQuery, updateConversationContext, FAQContext } from './gemini.js';

let pineconeClient: Pinecone | null = null;

function getPineconeClient() {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY must be set in environment variables');
    }
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient;
}

export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
}

export interface SearchResult {
  question: string;
  answer: string;
  score: number;
  source: 'pinecone' | 'gemini' | 'keyword';
  faqId: string;
  reasoning?: string;
}

// Preloaded FAQs for keyword fallback and initial population
const PRELOADED_FAQS = [
  {
    id: 'faq_operating_hours',
    question: "Apa jam operasional RS Bhayangkara Brimob?",
    answer: "Rumah Sakit buka Senin–Jumat pukul 08.00–14.00 dan Sabtu pukul 08.00–12.00.",
    keywords: ["jam", "operasional", "buka", "rumah sakit", "rs", "jadwal", "waktu", "hari ini", "kerja"]
  },
  {
    id: 'faq_bpjs_acceptance',
    question: "Apakah RS menerima pasien BPJS?",
    answer: "Ya, kami menerima pasien BPJS sesuai prosedur Mobile JKN.",
    keywords: ["bpjs", "menerima", "pasien", "asuransi", "jaminan", "terima", "diterima", "menerima"]
  },
  {
    id: 'faq_online_registration',
    question: "Bagaimana cara mendaftar poliklinik secara online?",
    answer: "Anda bisa mendaftar melalui aplikasi Mobile JKN atau aplikasi RS Bhayangkara Brimob.",
    keywords: ["daftar", "poliklinik", "online", "mendaftar", "pendaftaran", "aplikasi", "mobile jkn", "cara"]
  },
  {
    id: 'faq_registration_location',
    question: "Di mana lokasi pendaftaran pasien rawat jalan?",
    answer: "Loket pendaftaran pasien rawat jalan berada di Gedung Instalasi Rawat Jalan lantai 1.",
    keywords: ["lokasi", "pendaftaran", "rawat jalan", "loket", "gedung", "lantai", "dimana", "tempat"]
  },
  {
    id: 'faq_emergency_services',
    question: "Apakah RS menyediakan layanan UGD 24 jam?",
    answer: "Ya, kami menyediakan layanan UGD yang beroperasi 24 jam.",
    keywords: ["ugd", "darurat", "24 jam", "emergency", "gawat darurat", "layanan", "ada", "punya", "tersedia", "apa rs punya", "rs punya", "punya"]
  },
  {
    "id": "faq_poliklinik_gigi",
    "question": "Jam berapa layanan poliklinik gigi buka?",
    "answer": "Ya, kami menyediakan layanan poliklinik gigi dengan jadwal Senin-Jumat pukul 08.00-12.00.",
    "keywords": ["poliklinik", "gigi", "dokter gigi", "klinik gigi", "ada", "tersedia"]
  },
  {
    "id": "faq_poliklinik_anak",
    "question": "Jam berapa layanan poliklinik anak buka?",
    "answer": "Ya, kami menyediakan layanan poliklinik anak dengan jadwal Senin-Jumat pukul 12.00-16.00.",
    "keywords": ["poliklinik", "anak", "dokter anak", "klinik anak", "ada", "tersedia"]
  },
  {
    "id": "faq_biaya_pendaftaran",
    "question": "Berapa biaya pendaftaran poliklinik?",
    "answer": "Biaya pendaftaran poliklinik bervariasi tergantung jenis poliklinik. Untuk informasi detail, silakan hubungi bagian administrasi.",
    "keywords": ["biaya", "pendaftaran", "harga", "tarif", "berapa", "poliklinik", "daftar"]
  }
];

// Configuration for existing multilingual-e5-large index
const PINECONE_CONFIG = {
  indexName: 'rs-bhayangkara-faq',
  namespace: 'hospital-faqs',
  similarityThreshold: 0.65,
  topK: 5,
  dimensions: 1024 // multilingual-e5-large dimensions
};

export async function initializePinecone() {
  try {
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_CONFIG.indexName);
    
    // Test connection by getting index stats
    const stats = await index.describeIndexStats();
    console.log('Pinecone index stats:', stats);
    console.log('✅ Pinecone initialized successfully');
    
    return true;
  } catch (error: any) {
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      console.log('⚠️ Pinecone index not found. Please create the index with:');
      console.log(`   - Name: ${PINECONE_CONFIG.indexName}`);
      console.log('   - Metric: cosine');
      console.log('   - Dimensions: 1024 (for multilingual-e5-large)');
      console.log('   - Cloud: aws');
      console.log('   - Region: us-east-1');
      return false;
    }
    console.error('Pinecone initialization error:', error);
    return false;
  }
}

// Keyword-based fallback search
function keywordSearch(query: string): SearchResult | null {
  const cleanedQuery = preprocessQuery(query);
  const queryWords = cleanedQuery.split(' ');
  
  console.log(`🔍 Keyword search for: "${cleanedQuery}"`);
  
  // Enhanced keyword matching with better scoring
  let bestMatch: SearchResult | null = null;
  let bestScore = 0;
  
  for (const faq of PRELOADED_FAQS) {
    const keywordMatches = faq.keywords.filter(keyword => 
      queryWords.some(word => word.includes(keyword) || keyword.includes(word))
    );
    
    // Also check for exact phrase matches
    const exactPhraseMatches = faq.keywords.filter(keyword => 
      cleanedQuery.includes(keyword)
    );
    
    const allMatches = [...new Set([...keywordMatches, ...exactPhraseMatches])];
    
    // Calculate score based on number of matches and query length
    const matchRatio = allMatches.length / Math.max(queryWords.length, 1);
    const score = matchRatio * 0.8 + (allMatches.length * 0.1);
    
    // More flexible matching - accept single strong keyword matches
    if (allMatches.length >= 1 && score > bestScore) {
      bestScore = score;
      bestMatch = {
        question: faq.question,
        answer: faq.answer,
        score: Math.min(score, 0.9),
        source: 'keyword',
        faqId: faq.id
      };
      console.log(`✅ Keyword match found: "${faq.question}" (keywords: ${allMatches.join(', ')}, score: ${score.toFixed(3)})`);
    }
  }
  
  return bestMatch;
}

export async function storeFAQ(
  question: string, 
  answer: string,
  faqId?: string
): Promise<boolean> {
  try {
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_CONFIG.indexName);
    
    // Generate a unique ID if not provided
    const id = faqId || `faq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate embedding for the question using OpenAI
    const embedding = await generateEmbedding(question);
    
    // Store in Pinecone
    await index.upsert([{
      id: id,
      values: embedding,
      metadata: {
        question: question,
        answer: answer,
        timestamp: new Date().toISOString()
      }
    }]);
    
    console.log('✅ FAQ stored in Pinecone:', { id, question: question.substring(0, 50) + '...' });
    return true;
  } catch (error: any) {
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      console.log('⚠️ Pinecone index not found - FAQ not stored');
      return false;
    }
    console.error('Error storing FAQ in Pinecone:', error);
    return false;
  }
}

export async function searchSimilarFAQs(
  question: string, 
  phoneNumber?: string,
  topK: number = PINECONE_CONFIG.topK
): Promise<SearchResult[]> {
  try {
    // Preprocess the query
    const preprocessedQuery = preprocessQuery(question);
    console.log(`🔍 Searching for: "${question}" -> preprocessed: "${preprocessedQuery}"`);
    
    // Step 1: Try Pinecone vector search
    console.log('🔍 Trying Pinecone vector search...');
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_CONFIG.indexName);
    
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(preprocessedQuery);
    
    // Search for similar vectors
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: topK,
      includeMetadata: true
    });
    
    const pineconeResults = queryResponse.matches
      .filter(match => match.score && match.score >= PINECONE_CONFIG.similarityThreshold)
      .map(match => ({
        question: match.metadata?.question as string,
        answer: match.metadata?.answer as string,
        score: match.score || 0,
        source: 'pinecone' as const,
        faqId: match.id
      }));
    
    console.log(`🔍 Found ${pineconeResults.length} similar FAQs above threshold ${PINECONE_CONFIG.similarityThreshold}`);
    
    // Step 2: If we have Pinecone results, use Gemini to select the best one
    if (pineconeResults.length > 0) {
      console.log('🤖 Using Gemini to select best FAQ from Pinecone results...');
      
      const faqCandidates: FAQContext[] = pineconeResults.map(result => ({
        id: result.faqId,
        question: result.question,
        answer: result.answer,
        score: result.score
      }));
      
      const geminiResponse = await selectBestFAQ(question, faqCandidates, phoneNumber);
      
      if (geminiResponse.selectedFAQId && geminiResponse.confidence > 0.5) {
        const selectedFAQ = pineconeResults.find(result => result.faqId === geminiResponse.selectedFAQId);
        if (selectedFAQ) {
          console.log(`✅ Gemini selected FAQ: "${selectedFAQ.question}" (confidence: ${geminiResponse.confidence.toFixed(3)})`);
          console.log(`🤖 Reasoning: ${geminiResponse.reasoning}`);
          
          // Update conversation context
          if (phoneNumber) {
            updateConversationContext(phoneNumber, question, selectedFAQ.faqId);
          }
          
          return [{
            ...selectedFAQ,
            source: 'gemini',
            reasoning: geminiResponse.reasoning
          }];
        }
      } else {
        console.log(`⚠️ Gemini couldn't select a good FAQ (confidence: ${geminiResponse.confidence.toFixed(3)})`);
        if (geminiResponse.fallbackReason) {
          console.log(`🤖 Fallback reason: ${geminiResponse.fallbackReason}`);
        }
      }
    }
    
    // Step 3: If Pinecone fails or Gemini can't select, try keyword search
    console.log('🔍 Trying keyword search fallback...');
    const keywordResult = keywordSearch(question);
    if (keywordResult) {
      console.log('✅ Keyword fallback found a match!');
      
      // Update conversation context
      if (phoneNumber) {
        updateConversationContext(phoneNumber, question, keywordResult.faqId);
      }
      
      return [keywordResult];
    }
    
    console.log('❌ No suitable FAQ found');
    return [];
    
  } catch (error: any) {
    console.error('Error in hybrid search:', error);
    
    // Fallback to keyword search on error
    console.log('🔍 Error occurred, trying keyword search...');
    const keywordResult = keywordSearch(question);
    if (keywordResult) {
      console.log('✅ Keyword fallback found a match!');
      
      // Update conversation context
      if (phoneNumber) {
        updateConversationContext(phoneNumber, question, keywordResult.faqId);
      }
      
      return [keywordResult];
    }
    
    return [];
  }
}

export async function preloadFAQs() {
  console.log('🚀 Preloading FAQs into Pinecone...');
  
  try {
    for (const faq of PRELOADED_FAQS) {
      await storeFAQ(faq.question, faq.answer, faq.id);
      console.log('✅ Preloaded FAQ:', faq.question.substring(0, 30) + '...');
    }
    
    console.log('✅ All FAQs preloaded successfully');
  } catch (error) {
    console.error('❌ Error preloading FAQs:', error);
  }
}

// Export FAQ data for external use
export function getPreloadedFAQs() {
  return PRELOADED_FAQS;
}

// Configuration getters for external adjustment
export function getPineconeConfig() {
  return { ...PINECONE_CONFIG };
}

export function updatePineconeConfig(newConfig: Partial<typeof PINECONE_CONFIG>) {
  Object.assign(PINECONE_CONFIG, newConfig);
  console.log('🔧 Updated Pinecone configuration:', PINECONE_CONFIG);
} 