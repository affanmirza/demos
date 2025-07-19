// Simple test script to verify keyword matching
const PRELOADED_FAQS = [
  {
    question: "Apa jam operasional RS Bhayangkara Brimob?",
    answer: "Rumah Sakit buka Senin–Jumat pukul 08.00–14.00 dan Sabtu pukul 08.00–12.00.",
    keywords: ["jam", "operasional", "buka", "rumah sakit", "rs", "jadwal", "waktu", "hari ini", "kerja"]
  },
  {
    question: "Apakah RS menerima pasien BPJS?",
    answer: "Ya, kami menerima pasien BPJS sesuai prosedur Mobile JKN.",
    keywords: ["bpjs", "menerima", "pasien", "asuransi", "jaminan", "terima", "diterima", "menerima"]
  },
  {
    question: "Bagaimana cara mendaftar poliklinik secara online?",
    answer: "Anda bisa mendaftar melalui aplikasi Mobile JKN atau aplikasi RS Bhayangkara Brimob.",
    keywords: ["daftar", "poliklinik", "online", "mendaftar", "pendaftaran", "aplikasi", "mobile jkn", "cara"]
  },
  {
    question: "Di mana lokasi pendaftaran pasien rawat jalan?",
    answer: "Loket pendaftaran pasien rawat jalan berada di Gedung Instalasi Rawat Jalan lantai 1.",
    keywords: ["lokasi", "pendaftaran", "rawat jalan", "loket", "gedung", "lantai", "dimana", "tempat"]
  },
  {
    question: "Apakah RS menyediakan layanan UGD 24 jam?",
    answer: "Ya, kami menyediakan layanan UGD yang beroperasi 24 jam.",
    keywords: ["ugd", "darurat", "24 jam", "emergency", "gawat darurat", "layanan", "ada", "punya", "tersedia", "apa rs punya", "rs punya", "punya"]
  }
];

// Preprocess user query for better matching
function preprocessQuery(query) {
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
function keywordSearch(query) {
  const cleanedQuery = preprocessQuery(query);
  const queryWords = cleanedQuery.split(' ');
  
  console.log(`🔍 Keyword search for: "${cleanedQuery}"`);
  
  // Enhanced keyword matching with better scoring
  let bestMatch = null;
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
        source: 'keyword'
      };
      console.log(`✅ Keyword match found: "${faq.question}" (keywords: ${allMatches.join(', ')}, score: ${score.toFixed(3)})`);
    }
  }
  
  return bestMatch;
}

// Test queries from the logs
const testQueries = [
  "ada ugd?",
  "apa terima bpjs?",
  "apakah hari ini buka?",
  "apa rs punya ugd"
];

console.log("🧪 Testing keyword matching with user queries...\n");

testQueries.forEach(query => {
  console.log(`\n📝 Testing: "${query}"`);
  const result = keywordSearch(query);
  if (result) {
    console.log(`✅ MATCH: ${result.question}`);
    console.log(`📄 Answer: ${result.answer}`);
    console.log(`🎯 Score: ${result.score.toFixed(3)}`);
  } else {
    console.log(`❌ NO MATCH FOUND`);
  }
  console.log("---");
}); 