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

export interface ChatMessage {
  id?: string;
  wa_id: string;
  user_message: string;
  bot_response: string;
  timestamp?: string;
}

export async function initializeDatabase() {
  try {
    // Create chat_history table if it doesn't exist
    const { error } = await supabase.client.rpc('create_chat_history_table_if_not_exists');
    
    if (error) {
      console.log('Table creation error (might already exist):', error.message);
      // Try to create table manually if RPC doesn't exist
      await createChatHistoryTable();
    }
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

async function createChatHistoryTable() {
  // This is a fallback if the RPC function doesn't exist
  // In production, you'd use proper migrations
  console.log('Creating chat_history table manually...');
  
  const { error } = await supabase.client
    .from('chat_history')
    .select('*')
    .limit(1);
    
  if (error && error.code === 'PGRST116') {
    console.log('Chat history table does not exist, please create it manually with:');
    console.log(`
      CREATE TABLE chat_history (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        wa_id TEXT NOT NULL,
        user_message TEXT NOT NULL,
        bot_response TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  }
}

export async function storeChatMessage(
  waId: string, 
  userMessage: string, 
  botResponse: string
): Promise<ChatMessage | null> {
  try {
    const { data, error } = await supabase.client
      .from('chat_history')
      .insert({
        wa_id: waId,
        user_message: userMessage,
        bot_response: botResponse
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing chat message:', error);
      return null;
    }

    console.log('✅ Chat message stored successfully:', { wa_id: data.wa_id, timestamp: data.timestamp });
    return data as unknown as ChatMessage;
  } catch (error) {
    console.error('Error storing chat message:', error);
    return null;
  }
}

export async function getChatHistory(waId: string, limit: number = 10): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase.client
      .from('chat_history')
      .select('*')
      .eq('wa_id', waId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }

    return (data || []) as unknown as ChatMessage[];
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return [];
  }
}

export async function getAllChatHistory(limit: number = 50): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase.client
      .from('chat_history')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching all chat history:', error);
      return [];
    }

    return (data || []) as unknown as ChatMessage[];
  } catch (error) {
    console.error('Error fetching all chat history:', error);
    return [];
  }
} 