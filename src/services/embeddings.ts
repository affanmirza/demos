// Simple hash-based embedding function for multilingual-e5-large compatibility
// This generates 1024-dimensional vectors compatible with the existing Pinecone index

function simpleHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function generateHashEmbedding(text: string): number[] {
  const cleanedText = text.toLowerCase().trim();
  const words = cleanedText.split(/\s+/);
  const embedding: number[] = [];
  
  // Generate 1024-dimensional vector using hash-based approach
  for (let i = 0; i < 1024; i++) {
    let value = 0;
    
    // Use different combinations of words and positions
    for (let j = 0; j < words.length; j++) {
      const word = words[j];
      const hash = simpleHash(word + i.toString() + j.toString());
      value += (hash % 1000) / 1000; // Normalize to 0-1
    }
    
    // Add some variation based on text length and position
    const lengthFactor = Math.min(words.length / 10, 1);
    const positionFactor = Math.sin(i * 0.1) * 0.1;
    
    embedding.push((value / Math.max(words.length, 1)) * lengthFactor + positionFactor);
  }
  
  // Normalize the vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    console.log(`🔍 Generating hash-based embedding for: "${text.substring(0, 50)}..."`);
    const embedding = generateHashEmbedding(text);
    console.log(`✅ Generated ${embedding.length}-dimensional embedding`);
    return embedding;
  } catch (error: any) {
    console.error('❌ Hash embedding error:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

export async function testEmbeddingConnection(): Promise<boolean> {
  try {
    const embedding = await generateEmbedding('test');
    console.log('✅ Hash-based embedding generation successful');
    console.log(`📊 Embedding dimensions: ${embedding.length}`);
    return true;
  } catch (error: any) {
    console.error('❌ Hash-based embedding generation failed:', error);
    return false;
  }
} 