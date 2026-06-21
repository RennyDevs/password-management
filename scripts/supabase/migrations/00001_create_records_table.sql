-- ============================================================================
-- Migration 00001: Create records table and initial RLS policies
-- Date: 2026-06-19
-- ============================================================================

-- 1. Create the records table
CREATE TABLE IF NOT EXISTS public.records (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  nonce TEXT NOT NULL,
  salt TEXT NOT NULL,
  alg_version TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- 3. RLS: SELECT — users can only see their own records
CREATE POLICY "Users can view own records"
  ON public.records FOR SELECT
  USING (auth.uid() = user_id);

-- 4. RLS: INSERT — users can insert their own records
CREATE POLICY "Users can insert own records"
  ON public.records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. RLS: UPDATE — users can update their own records
CREATE POLICY "Users can update own records"
  ON public.records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. RLS: DELETE — users can delete their own records
CREATE POLICY "Users can delete own records"
  ON public.records FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Trigger: prevent user_id from being changed on update
CREATE OR REPLACE FUNCTION public.prevent_user_id_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'user_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_records_prevent_user_id_change ON public.records;
CREATE TRIGGER trg_records_prevent_user_id_change
  BEFORE UPDATE ON public.records
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_id_change();

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_records_user_id    ON public.records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_created_at ON public.records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_tags       ON public.records USING GIN(tags);
