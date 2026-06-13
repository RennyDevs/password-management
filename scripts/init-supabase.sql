-- Create the records table for storing encrypted blobs
CREATE TABLE IF NOT EXISTS records (
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

-- Enable Row Level Security
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Users can only see their own records
CREATE POLICY "Users can view own records"
  ON records FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own records
CREATE POLICY "Users can insert own records"
  ON records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own records
CREATE POLICY "Users can update own records"
  ON records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own records
CREATE POLICY "Users can delete own records"
  ON records FOR DELETE
  USING (auth.uid() = user_id);

-- Index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at DESC);

-- GIN index on tags for fast tag-based filtering
CREATE INDEX IF NOT EXISTS idx_records_tags ON records USING GIN(tags);
