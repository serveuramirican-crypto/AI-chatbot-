-- Create chat_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_name TEXT NOT NULL,
  is_taken_over BOOLEAN DEFAULT false,
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent', 'admin')),
  content TEXT NOT NULL,
  products JSONB, -- Stores array of products for the carousel
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) but allow anonymous access for now (for the dashboard)
-- In a production environment, you should secure these properly with authentication policies.
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for all users on chat_sessions" ON chat_sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable read/write for all users on chat_messages" ON chat_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
