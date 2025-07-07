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
  category: 'doctor_inquiry' | 'general' | 'review';
  timestamp: Date;
}

export interface SearchResult {
  question: string;
  answer: string;
  score: number;
}

export async function initializePinecone() {
  try {
    const pinecone = getPineconeClient();
    const index = pinecone.index('quickstart');
    
    // Test connection by getting index stats
    const stats = await index.describeIndexStats();
    console.log('Pinecone index stats:', stats);
    console.log('Pinecone initialized successfully');
    
    return true;
  } catch (error: any) {
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      console.log('⚠️ Pinecone index not found. Please create the index with:');
      console.log('   - Name: quickstart');
      console.log('   - Metric: cosine');
      console.log('   - Dimensions: 768');
      console.log('   - Model: llama-text-embed-v2');
      console.log('   - Cloud: aws');
      console.log('   - Region: us-east-1');
      return false;
    }
    console.error('Pinecone initialization error:', error);
    return false;
  }
}

export async function storeFAQ(
  question: string, 
  answer: string, 
  category: 'doctor_inquiry' | 'general' | 'review'
): Promise<boolean> {
  try {
    const pinecone = getPineconeClient();
    const index = pinecone.index('quickstart');
    
    // Generate a unique ID for this FAQ entry
    const id = `faq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // For now, we'll use a simple hash as embedding (in production, use a proper embedding model)
    const embedding = generateSimpleEmbedding(question);
    
    // Store in Pinecone
    await index.upsert([{
      id: id,
      values: embedding,
      metadata: {
        question: question,
        answer: answer,
        category: category,
        timestamp: new Date().toISOString()
      }
    }]);
    
    console.log('FAQ stored in Pinecone:', { id, question: question.substring(0, 50) + '...' });
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
  category?: 'doctor_inquiry' | 'general' | 'review',
  topK: number = 3
): Promise<SearchResult[]> {
  try {
    const pinecone = getPineconeClient();
    const index = pinecone.index('quickstart');
    
    // Generate embedding for the search query
    const queryEmbedding = generateSimpleEmbedding(question);
    
    // Build filter if category is specified
    const filter = category ? { category: { $eq: category } } : undefined;
    
    // Search for similar vectors
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: topK,
      includeMetadata: true,
      filter: filter
    });
    
    const results: SearchResult[] = queryResponse.matches
      .filter(match => match.score && match.score > 0.7) // Only return good matches
      .map(match => ({
        question: match.metadata?.question as string,
        answer: match.metadata?.answer as string,
        score: match.score || 0
      }));
    
    console.log(`Found ${results.length} similar FAQs for: "${question.substring(0, 50)}..."`);
    return results;
  } catch (error: any) {
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      console.log('⚠️ Pinecone index not found - no FAQ search performed');
      return [];
    }
    console.error('Error searching FAQs in Pinecone:', error);
    return [];
  }
}

// Simple embedding generation function
// In production, you'd use a proper embedding model like OpenAI's text-embedding-ada-002
function generateSimpleEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(768).fill(0);
  
  // Simple hash-based embedding (not as good as real embeddings, but works for demo)
  words.forEach((word, index) => {
    const hash = word.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const position = Math.abs(hash) % 768;
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

export async function seedSampleFAQs() {
  const sampleFAQs = [
    {
      question: "Saya mau tanya jadwal dokter",
      answer: "Untuk jadwal dokter, spesialisasi apa yang Anda cari? Kami memiliki dokter umum dan spesialis yang tersedia pada jam kerja.",
      category: "doctor_inquiry" as const
    },
    {
      question: "Ada dokter spesialis jantung tidak?",
      answer: "Ya, kami memiliki dokter spesialis jantung. Dr. Ahmad tersedia pada Senin-Jumat jam 09:00-17:00. Silakan buat janji terlebih dahulu.",
      category: "doctor_inquiry" as const
    },
    {
      question: "Berapa biaya konsultasi dokter umum?",
      answer: "Biaya konsultasi dokter umum adalah Rp 150.000. Untuk informasi lebih detail, silakan hubungi bagian administrasi.",
      category: "general" as const
    },
    {
      question: "Jam buka rumah sakit?",
      answer: "Rumah sakit buka 24 jam untuk layanan darurat. Untuk poliklinik umum: Senin-Jumat 08:00-20:00, Sabtu-Minggu 08:00-17:00.",
      category: "general" as const
    },
    {
      question: "Bagaimana cara buat janji dokter?",
      answer: "Anda bisa membuat janji dokter melalui WhatsApp ini, telepon, atau datang langsung ke bagian administrasi. Kami sarankan booking 1-2 hari sebelumnya.",
      category: "doctor_inquiry" as const
    }
  ];

  try {
    for (const faq of sampleFAQs) {
      await storeFAQ(faq.question, faq.answer, faq.category);
      console.log('Seeded FAQ:', faq.question.substring(0, 30) + '...');
    }
    
    console.log('Sample FAQs seeded successfully');
  } catch (error) {
    console.error('Error seeding sample FAQs:', error);
  }
} 