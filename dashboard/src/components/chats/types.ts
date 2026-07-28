export type MessageRole = 'user' | 'agent' | 'admin';

export interface ProductRecommendation {
  id?: string;
  name?: string;
  image?: string;
  image_url?: string;
  price?: number | string;
  link?: string;
  description?: string;
  color?: string;
  size?: string;
  fabric?: string;
  category?: string;
  [key: string]: any;
}

// Matches the `chat_messages` table in Supabase
export interface ChatMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  products?: ProductRecommendation[] | string | null;
  created_at: string;
}

// Matches the `chat_sessions` table in Supabase
export interface ChatSession {
  id: string;
  user_name: string;
  is_taken_over: boolean;
  last_interaction: string;
  created_at: string;
  
  // This array will be populated by our Supabase join query: `*, chat_messages(*)`
  chat_messages?: ChatMessage[]; 
}

// Backward compatibility alias for the UI components if needed
export type Conversation = ChatSession;

