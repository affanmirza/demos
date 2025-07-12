import { Pinecone } from '@pinecone-database/pinecone';

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
}

// Preloaded FAQs for keyword fallback
const PRELOADED_FAQS = [
  {
    question: "Apa jam operasional RS Bhayangkara Brimob?",
    answer: "Rumah Sakit buka Senin–Jumat pukul 08.00–14.00 dan Sabtu pukul 08.00–12.00.",
    keywords: ["jam", "operasional", "buka", "rumah sakit", "rs", "jadwal", "waktu"]
  },
  {
    question: "Apakah RS menerima pasien BPJS?",
    answer: "Ya, kami menerima pasien BPJS sesuai prosedur Mobile JKN.",
    keywords: ["bpjs", "menerima", "pasien", "asuransi", "jaminan"]
  },
  {
    question: "Bagaimana cara mendaftar poliklinik secara online?",
    answer: "Anda bisa mendaftar melalui aplikasi Mobile JKN atau aplikasi RS Bhayangkara Brimob.",
    keywords: ["daftar", "poliklinik", "online", "mendaftar", "pendaftaran", "aplikasi", "mobile jkn"]
  },
  {
    question: "Di mana lokasi pendaftaran pasien rawat jalan?",
    answer: "Loket pendaftaran pasien rawat jalan berada di Gedung Instalasi Rawat Jalan lantai 1.",
    keywords: ["lokasi", "pendaftaran", "rawat jalan", "loket", "gedung", "lantai", "dimana"]
  },
  {
    question: "Apakah RS menyediakan layanan UGD 24 jam?",
    answer: "Ya, kami menyediakan layanan UGD yang beroperasi 24 jam.",
    keywords: ["ugd", "darurat", "24 jam", "emergency", "gawat darurat", "layanan"]
  }
];

export async function initializePinecone() {
  try {
    const pinecone = getPineconeClient();
    const index = pinecone.index('rs-bhayangkara-faq');
    
    // Test connection by getting index stats
    const stats = await index.describeIndexStats();
    console.log('Pinecone index stats:', stats);
    console.log('✅ Pinecone initialized successfully');
    
    return true;
  } catch (error: any) {
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      console.log('⚠️ Pinecone index not found. Please create the index with:');
      console.log('   - Name: rs-bhayangkara-faq');
      console.log('   - Metric: cosine');
      console.log('   - Dimensions: 1024');
      console.log('   - Model: multilingual-e5-large');
      console.log('   - Cloud: aws');
      console.log('   - Region: us-east-1');
      return false;
    }
    console.error('Pinecone initialization error:', error);
    return false;
  }
}

// Preprocess user query for better matching
function preprocessQuery(query: string): string {
  return query
    .toLowerCase()
    // Replace common abbreviations and variations
    .replace(/\brs\b/g, "rumah sakit")
    .replace(/\bdr\b/g, "dokter")
    .replace(/\bjam\b/g, "jam")
    .replace(/\boperasional\b/g, "operasional")
    .replace(/\bbuka\b/g, "buka")
    .replace(/\bjadwal\b/g, "jadwal")
    .replace(/\bwaktu\b/g, "waktu")
    .replace(/\bpoliklinik\b/g, "poliklinik")
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

// Keyword-based fallback search
function keywordSearch(query: string): SearchResult | null {
  const cleanedQuery = preprocessQuery(query);
  const queryWords = cleanedQuery.split(' ');
  
  console.log(`🔍 Keyword search for: "${cleanedQuery}"`);
  
  for (const faq of PRELOADED_FAQS) {
    const keywordMatches = faq.keywords.filter(keyword => 
      queryWords.some(word => word.includes(keyword) || keyword.includes(word))
    );
    
    if (keywordMatches.length >= 2) { // Need at least 2 keyword matches
      console.log(`✅ Keyword match found: "${faq.question}" (keywords: ${keywordMatches.join(', ')})`);
      return {
        question: faq.question,
        answer: faq.answer,
        score: 0.8 // High score for keyword matches
      };
    }
  }
  
  return null;
}

export async function storeFAQ(
  question: string, 
  answer: string
): Promise<boolean> {
  try {
    const pinecone = getPineconeClient();
    const index = pinecone.index('rs-bhayangkara-faq');
    
    // Generate a unique ID for this FAQ entry
    const id = `faq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate embedding for the question
    const embedding = generateSimpleEmbedding(question);
    
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
  topK: number = 5
): Promise<SearchResult[]> {
  try {
    const pinecone = getPineconeClient();
    const index = pinecone.index('rs-bhayangkara-faq');
    
    // Preprocess the query
    const preprocessedQuery = preprocessQuery(question);
    console.log(`🔍 Searching for: "${question}" -> preprocessed: "${preprocessedQuery}"`);
    
    // Generate a simple embedding for the search query
    const queryEmbedding = generateSimpleEmbedding(preprocessedQuery);
    
    // Search for similar vectors
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: topK,
      includeMetadata: true
    });
    
    const results: SearchResult[] = queryResponse.matches
      .filter(match => match.score && match.score > 0.6) // Lowered threshold for better matching
      .map(match => ({
        question: match.metadata?.question as string,
        answer: match.metadata?.answer as string,
        score: match.score || 0
      }));
    
    console.log(`🔍 Found ${results.length} similar FAQs for: "${question.substring(0, 50)}..."`);
    
    // If no good Pinecone matches, try keyword search
    if (results.length === 0) {
      console.log('🔍 No Pinecone matches, trying keyword search...');
      const keywordResult = keywordSearch(question);
      if (keywordResult) {
        console.log('✅ Keyword fallback found a match!');
        return [keywordResult];
      }
    }
    
    return results;
  } catch (error: any) {
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      console.log('⚠️ Pinecone index not found - trying keyword search...');
      const keywordResult = keywordSearch(question);
      if (keywordResult) {
        console.log('✅ Keyword fallback found a match!');
        return [keywordResult];
      }
      return [];
    }
    console.error('Error searching FAQs in Pinecone:', error);
    
    // Fallback to keyword search on error
    console.log('🔍 Pinecone error, trying keyword search...');
    const keywordResult = keywordSearch(question);
    if (keywordResult) {
      console.log('✅ Keyword fallback found a match!');
      return [keywordResult];
    }
    
    return [];
  }
}

// Simple embedding generation function for 1024 dimensions
// Note: This is a simple hash-based embedding for demo purposes
// In production, you should use proper embedding models or Pinecone's automatic embedding feature
// when it becomes available in the SDK
function generateSimpleEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(1024).fill(0);
  
  // Simple hash-based embedding (not as good as real embeddings, but works for demo)
  words.forEach((word, index) => {
    const hash = word.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const position = Math.abs(hash) % 1024;
    embedding[position] += 1;
  });
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    embedding.forEach((val, i) => {
      embedding[i] = val / magnitude;
    });
  }
  
  return embedding;
}

export async function preloadFAQs() {
  const preloadedFAQs = [
    {
      question: "Apa jam operasional RS Bhayangkara Brimob?",
      answer: "Rumah Sakit buka Senin–Jumat pukul 08.00–14.00 dan Sabtu pukul 08.00–12.00."
    },
    {
      question: "Apakah RS menerima pasien BPJS?",
      answer: "Ya, kami menerima pasien BPJS sesuai prosedur Mobile JKN."
    },
    {
      question: "Bagaimana cara mendaftar poliklinik secara online?",
      answer: "Anda bisa mendaftar melalui aplikasi Mobile JKN atau aplikasi RS Bhayangkara Brimob."
    },
    {
      question: "Di mana lokasi pendaftaran pasien rawat jalan?",
      answer: "Loket pendaftaran pasien rawat jalan berada di Gedung Instalasi Rawat Jalan lantai 1."
    },
    {
      question: "Apakah RS menyediakan layanan UGD 24 jam?",
      answer: "Ya, kami menyediakan layanan UGD yang beroperasi 24 jam."
    }
  ];

  try {
    console.log('🚀 Preloading FAQs into Pinecone...');
    
    for (const faq of preloadedFAQs) {
      await storeFAQ(faq.question, faq.answer);
      console.log('✅ Preloaded FAQ:', faq.question.substring(0, 30) + '...');
    }
    
    console.log('✅ All FAQs preloaded successfully');
  } catch (error) {
    console.error('❌ Error preloading FAQs:', error);
  }
} 