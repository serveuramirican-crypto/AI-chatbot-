-- -----------------------------------------------------------------------------
-- Chat History: chat_sessions + chat_messages
-- -----------------------------------------------------------------------------

-- 1. Sessions table — one row per conversation
CREATE TABLE IF NOT EXISTS chat_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Messages table — ordered exchange of messages within a session
CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Index for fast history fetches
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages(session_id, created_at ASC);

-- 4. RLS — open (same pattern as agents table)
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_chat_sessions" ON chat_sessions;
CREATE POLICY "open_chat_sessions" ON chat_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_chat_messages" ON chat_messages;
CREATE POLICY "open_chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
