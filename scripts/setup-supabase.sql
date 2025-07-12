-- Supabase Setup Script for Hospital FAQ Chatbot
-- Run this in your Supabase SQL Editor

-- Create chat_history table
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wa_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries by wa_id
CREATE INDEX IF NOT EXISTS idx_chat_history_wa_id ON chat_history(wa_id);

-- Create index for timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp ON chat_history(timestamp DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for demo purposes)
-- In production, you'd want more restrictive policies
CREATE POLICY "Allow all operations" ON chat_history
  FOR ALL USING (true);

-- Insert sample data (optional)
INSERT INTO chat_history (wa_id, user_message, bot_response) VALUES
  ('628123456789', 'Jam buka rumah sakit?', 'Rumah Sakit buka Senin–Jumat pukul 08.00–14.00 dan Sabtu pukul 08.00–12.00.'),
  ('628123456789', 'Apakah ada layanan UGD?', 'Ya, kami menyediakan layanan UGD yang beroperasi 24 jam.'),
  ('628987654321', 'Apakah RS menerima pasien BPJS?', 'Ya, kami menerima pasien BPJS sesuai prosedur Mobile JKN.')
ON CONFLICT DO NOTHING;

-- Verify table creation
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'chat_history'
ORDER BY ordinal_position; 