import { createClient } from '@supabase/supabase-js';

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_API_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_API_KEY must be set in environment variables');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

export const supabase = {
  get client() {
    return getSupabaseClient();
  }
};

export interface Review {
  id?: string;
  wa_id: string;
  review: string;
  timestamp?: string;
}

export async function initializeDatabase() {
  try {
    // Create reviews table if it doesn't exist
    const { error } = await supabase.client.rpc('create_reviews_table_if_not_exists');
    
    if (error) {
      console.log('Table creation error (might already exist):', error.message);
      // Try to create table manually if RPC doesn't exist
      await createReviewsTable();
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

async function createReviewsTable() {
  // This is a fallback if the RPC function doesn't exist
  // In production, you'd use proper migrations
  console.log('Creating reviews table manually...');
  
  const { error } = await supabase.client
    .from('reviews')
    .select('*')
    .limit(1);
    
  if (error && error.code === 'PGRST116') {
    console.log('Reviews table does not exist, please create it manually with:');
    console.log(`
      CREATE TABLE reviews (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        wa_id TEXT NOT NULL,
        review TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  }
}

export async function storeReview(waId: string, review: string): Promise<Review | null> {
  try {
    const { data, error } = await supabase.client
      .from('reviews')
      .insert({
        wa_id: waId,
        review: review
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing review:', error);
      return null;
    }

    console.log('Review stored successfully:', data);
    return data as unknown as Review;
  } catch (error) {
    console.error('Error storing review:', error);
    return null;
  }
}

export async function seedSampleReviews() {
  const sampleReviews = [
    {
      wa_id: '628123456789',
      review: 'Pelayanan sangat baik, dokter ramah dan profesional.'
    },
    {
      wa_id: '628987654321',
      review: 'Fasilitas bersih dan nyaman, proses pendaftaran cepat.'
    },
    {
      wa_id: '628555666777',
      review: 'Dokter sangat teliti dalam pemeriksaan, sangat puas dengan pelayanan.'
    }
  ];

  try {
    for (const review of sampleReviews) {
      const { error } = await supabase.client
        .from('reviews')
        .insert(review);

      if (error) {
        console.error('Error seeding review:', error);
      } else {
        console.log('Seeded review for:', review.wa_id);
      }
    }
    
    console.log('Sample reviews seeded successfully');
  } catch (error) {
    console.error('Error seeding sample reviews:', error);
  }
}

export async function getReviews(): Promise<Review[]> {
  try {
    const { data, error } = await supabase.client
      .from('reviews')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }

    return (data || []) as unknown as Review[];
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
} 