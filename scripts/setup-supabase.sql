-- Supabase Setup Script for Hospital Chatbot Demo
-- Run this in your Supabase SQL Editor

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wa_id TEXT NOT NULL,
  review TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries by wa_id
CREATE INDEX IF NOT EXISTS idx_reviews_wa_id ON reviews(wa_id);

-- Create index for timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_reviews_timestamp ON reviews(timestamp DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for demo purposes)
-- In production, you'd want more restrictive policies
CREATE POLICY "Allow all operations" ON reviews
  FOR ALL USING (true);

-- Insert sample data (optional)
INSERT INTO reviews (wa_id, review) VALUES
  ('628123456789', 'Pelayanan sangat baik, dokter ramah dan profesional.'),
  ('628987654321', 'Fasilitas bersih dan nyaman, proses pendaftaran cepat.'),
  ('628555666777', 'Dokter sangat teliti dalam pemeriksaan, sangat puas dengan pelayanan.')
ON CONFLICT DO NOTHING;

-- Verify table creation
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'reviews'
ORDER BY ordinal_position; 