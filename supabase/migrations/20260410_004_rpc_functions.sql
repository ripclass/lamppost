-- ============================================================
-- RPC functions for Q&A bank operations
-- Called from the application via supabase.rpc()
-- ============================================================

-- Vector similarity search against the Q&A bank
CREATE OR REPLACE FUNCTION search_qa_bank(
  query_embedding vector(768),
  target_chapter_id UUID,
  match_count INTEGER DEFAULT 5,
  filter_scene_index INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  chapter_id UUID,
  question TEXT,
  question_bn TEXT,
  answer TEXT,
  answer_bn TEXT,
  scene_index INTEGER,
  topic_tags TEXT[],
  difficulty TEXT,
  question_type TEXT,
  common_wrong_answer TEXT,
  why_wrong TEXT,
  has_whiteboard BOOLEAN,
  whiteboard_instructions JSONB,
  source TEXT,
  times_matched INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.chapter_id,
    q.question,
    q.question_bn,
    q.answer,
    q.answer_bn,
    q.scene_index,
    q.topic_tags,
    q.difficulty,
    q.question_type,
    q.common_wrong_answer,
    q.why_wrong,
    q.has_whiteboard,
    q.whiteboard_instructions,
    q.source,
    q.times_matched,
    1 - (q.question_embedding <=> query_embedding) AS similarity
  FROM qa_bank q
  WHERE q.chapter_id = target_chapter_id
    AND q.question_embedding IS NOT NULL
    AND (filter_scene_index IS NULL OR q.scene_index = filter_scene_index)
  ORDER BY q.question_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Atomic increment of match counter (avoids race conditions)
CREATE OR REPLACE FUNCTION increment_qa_match_count(qa_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE qa_bank
  SET times_matched = times_matched + 1,
      updated_at = now()
  WHERE id = qa_id;
END;
$$;
