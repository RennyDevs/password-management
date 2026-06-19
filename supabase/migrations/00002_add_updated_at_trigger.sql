-- ============================================================================
-- Migration 00002: Add auto-update trigger for updated_at
-- Date: 2026-06-19
-- ============================================================================

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_records_set_updated_at ON public.records;
CREATE TRIGGER trg_records_set_updated_at
  BEFORE UPDATE ON public.records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
