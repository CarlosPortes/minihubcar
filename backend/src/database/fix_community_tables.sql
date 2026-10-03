-- Script para criar as tabelas da comunidade e fotos de coleções
CREATE TABLE IF NOT EXISTS user_collection_photo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  photo_url VARCHAR(1000) NOT NULL,
  caption VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  reviewed_by UUID REFERENCES app_user(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_user_col_photo_user ON user_collection_photo(user_id);
CREATE INDEX IF NOT EXISTS ix_user_col_photo_status ON user_collection_photo(status);

CREATE TABLE IF NOT EXISTS direct_conversation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  last_message_text TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_direct_conv_user1 ON direct_conversation(user1_id);
CREATE INDEX IF NOT EXISTS ix_direct_conv_user2 ON direct_conversation(user2_id);
CREATE INDEX IF NOT EXISTS ix_direct_conv_last_message ON direct_conversation(last_message_at);

CREATE TABLE IF NOT EXISTS direct_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES direct_conversation(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_direct_msg_conversation ON direct_message(conversation_id);
CREATE INDEX IF NOT EXISTS ix_direct_msg_sender ON direct_message(sender_id);
CREATE INDEX IF NOT EXISTS ix_direct_msg_created_at ON direct_message(created_at);
