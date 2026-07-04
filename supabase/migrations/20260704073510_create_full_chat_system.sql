/*
# Chat System — Full Real-Time Messaging Platform

Creates tables in correct dependency order:
participants → conversations (with deferred constraint), messages, reactions, stories, story_views, calls, typing.
*/

-- ── Conversations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct','group')),
  name          text,
  avatar_url    text,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- ── Participants (created before policies on conversations) ───────────────────
CREATE TABLE IF NOT EXISTS chat_participants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  joined_at       timestamptz DEFAULT now(),
  left_at         timestamptz,
  last_read_at    timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- Now safe to add conversation policies that reference participants
DROP POLICY IF EXISTS "conv_select" ON chat_conversations;
CREATE POLICY "conv_select" ON chat_conversations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.conversation_id = chat_conversations.id AND cp.user_id = auth.uid() AND cp.left_at IS NULL
  ));

DROP POLICY IF EXISTS "conv_insert" ON chat_conversations;
CREATE POLICY "conv_insert" ON chat_conversations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "conv_update" ON chat_conversations;
CREATE POLICY "conv_update" ON chat_conversations FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "conv_delete" ON chat_conversations;
CREATE POLICY "conv_delete" ON chat_conversations FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Participants policies
DROP POLICY IF EXISTS "part_select" ON chat_participants;
CREATE POLICY "part_select" ON chat_participants FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_participants cp2
    WHERE cp2.conversation_id = chat_participants.conversation_id AND cp2.user_id = auth.uid() AND cp2.left_at IS NULL
  ));

DROP POLICY IF EXISTS "part_insert" ON chat_participants;
CREATE POLICY "part_insert" ON chat_participants FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM chat_participants cp3
      WHERE cp3.conversation_id = conversation_id AND cp3.user_id = auth.uid() AND cp3.role = 'admin' AND cp3.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "part_update" ON chat_participants;
CREATE POLICY "part_update" ON chat_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "part_delete" ON chat_participants;
CREATE POLICY "part_delete" ON chat_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── Messages ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type            text NOT NULL DEFAULT 'text'
                    CHECK (type IN ('text','image','audio','video','file','sticker','call_log','deleted')),
  content         text,
  media_url       text,
  media_mime      text,
  media_name      text,
  media_size      bigint,
  media_duration  int,
  sticker_id      text,
  reply_to_id     uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  call_type       text CHECK (call_type IN ('voice','video','group_voice','group_video')),
  call_duration   int,
  call_status     text CHECK (call_status IN ('missed','answered','declined','ended')),
  edited          boolean NOT NULL DEFAULT false,
  deleted_at      timestamptz,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msg_select" ON chat_messages;
CREATE POLICY "msg_select" ON chat_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.conversation_id = chat_messages.conversation_id AND cp.user_id = auth.uid() AND cp.left_at IS NULL
  ));

DROP POLICY IF EXISTS "msg_insert" ON chat_messages;
CREATE POLICY "msg_insert" ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid() AND cp.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "msg_update" ON chat_messages;
CREATE POLICY "msg_update" ON chat_messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "msg_delete" ON chat_messages;
CREATE POLICY "msg_delete" ON chat_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- ── Reactions ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "react_select" ON chat_reactions;
CREATE POLICY "react_select" ON chat_reactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN chat_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = chat_reactions.message_id AND cp.user_id = auth.uid() AND cp.left_at IS NULL
  ));

DROP POLICY IF EXISTS "react_insert" ON chat_reactions;
CREATE POLICY "react_insert" ON chat_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "react_update" ON chat_reactions;
CREATE POLICY "react_update" ON chat_reactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "react_delete" ON chat_reactions;
CREATE POLICY "react_delete" ON chat_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── Stories ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_stories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'image' CHECK (type IN ('image','video','text')),
  media_url   text,
  content     text,
  bg_color    text DEFAULT '#1f2937',
  font_size   int DEFAULT 24,
  expires_at  timestamptz DEFAULT (now() + interval '24 hours'),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE chat_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "story_select" ON chat_stories;
CREATE POLICY "story_select" ON chat_stories FOR SELECT TO authenticated
  USING (expires_at > now());

DROP POLICY IF EXISTS "story_insert" ON chat_stories;
CREATE POLICY "story_insert" ON chat_stories FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "story_update" ON chat_stories;
CREATE POLICY "story_update" ON chat_stories FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "story_delete" ON chat_stories;
CREATE POLICY "story_delete" ON chat_stories FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── Story views ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_story_views (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   uuid NOT NULL REFERENCES chat_stories(id) ON DELETE CASCADE,
  viewer_id  uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at  timestamptz DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

ALTER TABLE chat_story_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "storyview_select" ON chat_story_views;
CREATE POLICY "storyview_select" ON chat_story_views FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "storyview_insert" ON chat_story_views;
CREATE POLICY "storyview_insert" ON chat_story_views FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid());

DROP POLICY IF EXISTS "storyview_update" ON chat_story_views;
CREATE POLICY "storyview_update" ON chat_story_views FOR UPDATE TO authenticated
  USING (viewer_id = auth.uid());

DROP POLICY IF EXISTS "storyview_delete" ON chat_story_views;
CREATE POLICY "storyview_delete" ON chat_story_views FOR DELETE TO authenticated
  USING (viewer_id = auth.uid());

-- ── Call records ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_calls (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES chat_conversations(id) ON DELETE SET NULL,
  caller_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  call_type       text NOT NULL CHECK (call_type IN ('voice','video','group_voice','group_video')),
  status          text NOT NULL DEFAULT 'calling'
                    CHECK (status IN ('calling','answered','missed','declined','ended','busy')),
  started_at      timestamptz DEFAULT now(),
  ended_at        timestamptz,
  duration        int,
  participants    uuid[] DEFAULT '{}'
);

ALTER TABLE chat_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "call_select" ON chat_calls;
CREATE POLICY "call_select" ON chat_calls FOR SELECT TO authenticated
  USING (caller_id = auth.uid() OR auth.uid() = ANY(participants));

DROP POLICY IF EXISTS "call_insert" ON chat_calls;
CREATE POLICY "call_insert" ON chat_calls FOR INSERT TO authenticated
  WITH CHECK (caller_id = auth.uid());

DROP POLICY IF EXISTS "call_update" ON chat_calls;
CREATE POLICY "call_update" ON chat_calls FOR UPDATE TO authenticated
  USING (caller_id = auth.uid() OR auth.uid() = ANY(participants));

DROP POLICY IF EXISTS "call_delete" ON chat_calls;
CREATE POLICY "call_delete" ON chat_calls FOR DELETE TO authenticated
  USING (caller_id = auth.uid());

-- ── Typing indicators ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_typing (
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  updated_at      timestamptz DEFAULT now(),
  PRIMARY KEY(user_id, conversation_id)
);

ALTER TABLE chat_typing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "typing_select" ON chat_typing;
CREATE POLICY "typing_select" ON chat_typing FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "typing_insert" ON chat_typing;
CREATE POLICY "typing_insert" ON chat_typing FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "typing_update" ON chat_typing;
CREATE POLICY "typing_update" ON chat_typing FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "typing_delete" ON chat_typing;
CREATE POLICY "typing_delete" ON chat_typing FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cp_user      ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_cp_conv      ON chat_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cm_conv      ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cm_sender    ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_cr_msg       ON chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_cs_user      ON chat_stories(user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_cc_caller    ON chat_calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_ct_conv      ON chat_typing(conversation_id);

-- ── Realtime ──────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_typing;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_stories;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
