#!/usr/bin/env tsx
/**
 * FAQ Preloading Script
 * 
 * Loads FAQs from a JSON file and stores them in Pinecone with proper embeddings.
 * 
 * Usage:
 * npm run preload-faqs
 * 
 * FAQ JSON format:
 * [
 *   {
 *     "id": "faq_operating_hours",
 *     "question": "Apa jam operasional RS Bhayangkara Brimob?",
 *     "answer": "Rumah Sakit buka Senin–Jumat pukul 08.00–14.00 dan Sabtu pukul 08.00–12.00.",
 *     "keywords": ["jam", "operasional", "buka", "rumah sakit", "rs", "jadwal", "waktu", "hari ini", "kerja"]
 *   }
 * ]
 */

import { loadEnv } from '../src/config/env.js';
import { initializePinecone, storeFAQ, getPreloadedFAQs } from '../src/services/pinecone.js';
import { testEmbeddingConnection } from '../src/services/embeddings.js';
import fs from 'fs/promises';
import path from 'path';

loadEnv();

interface FAQData {
  id: string;
  question: string;
  answer: string;
  keywords?: string[];
}

async function loadFAQsFromFile(filePath: string): Promise<FAQData[]> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error loading FAQs from ${filePath}:`, error);
    return [];
  }
}

async function preloadFAQsFromFile(filePath: string): Promise<void> {
  console.log('🚀 Starting FAQ preloading from file...');
  
  // Test connections
  console.log('🔤 Testing OpenAI embeddings...');
  const embeddingsHealthy = await testEmbeddingConnection();
  if (!embeddingsHealthy) {
    console.error('❌ OpenAI embeddings not available');
    return;
  }
  
  console.log('🧠 Initializing Pinecone...');
  const pineconeInitialized = await initializePinecone();
  if (!pineconeInitialized) {
    console.error('❌ Pinecone not initialized');
    return;
  }
  
  // Load FAQs from file
  const faqs = await loadFAQsFromFile(filePath);
  if (faqs.length === 0) {
    console.log('⚠️ No FAQs found in file, using default FAQs');
    const defaultFaqs = getPreloadedFAQs();
    for (const faq of defaultFaqs) {
      await storeFAQ(faq.question, faq.answer, faq.id);
      console.log('✅ Preloaded FAQ:', faq.question.substring(0, 30) + '...');
    }
    return;
  }
  
  console.log(`📚 Found ${faqs.length} FAQs to preload`);
  
  // Store each FAQ
  for (const faq of faqs) {
    try {
      await storeFAQ(faq.question, faq.answer, faq.id);
      console.log(`✅ Preloaded FAQ: ${faq.question.substring(0, 50)}...`);
    } catch (error) {
      console.error(`❌ Failed to preload FAQ ${faq.id}:`, error);
    }
  }
  
  console.log('✅ FAQ preloading completed!');
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0] || path.join(process.cwd(), 'data', 'faqs.json');
  
  console.log(`📁 Loading FAQs from: ${filePath}`);
  
  try {
    await preloadFAQsFromFile(filePath);
  } catch (error) {
    console.error('❌ FAQ preloading failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 