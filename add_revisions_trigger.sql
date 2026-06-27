ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS revisions JSONB DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION log_job_revision()
RETURNS TRIGGER AS $$
DECLARE
  changes JSONB := '{}'::jsonb;
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title THEN changes := jsonb_set(changes, '{title}', jsonb_build_object('old', OLD.title, 'new', NEW.title)); END IF;
  IF NEW.subject IS DISTINCT FROM OLD.subject THEN changes := jsonb_set(changes, '{subject}', jsonb_build_object('old', OLD.subject, 'new', NEW.subject)); END IF;
  IF NEW.level IS DISTINCT FROM OLD.level THEN changes := jsonb_set(changes, '{level}', jsonb_build_object('old', OLD.level, 'new', NEW.level)); END IF;
  IF NEW.pages IS DISTINCT FROM OLD.pages THEN changes := jsonb_set(changes, '{pages}', jsonb_build_object('old', OLD.pages, 'new', NEW.pages)); END IF;
  IF NEW.instructions IS DISTINCT FROM OLD.instructions THEN changes := jsonb_set(changes, '{instructions}', jsonb_build_object('old', OLD.instructions, 'new', NEW.instructions)); END IF;
  IF NEW.deadline IS DISTINCT FROM OLD.deadline THEN changes := jsonb_set(changes, '{deadline}', jsonb_build_object('old', OLD.deadline, 'new', NEW.deadline)); END IF;
  IF NEW.client_budget IS DISTINCT FROM OLD.client_budget THEN changes := jsonb_set(changes, '{client_budget}', jsonb_build_object('old', OLD.client_budget, 'new', NEW.client_budget)); END IF;

  IF changes != '{}'::jsonb THEN
    NEW.revisions := COALESCE(OLD.revisions, '[]'::jsonb) || jsonb_build_object(
      'timestamp', NOW(),
      'changed_by', auth.uid(),
      'changes', changes
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_job_revision ON public.jobs;
CREATE TRIGGER trigger_log_job_revision
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION log_job_revision();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Clients can update own unassigned jobs'
  ) THEN
    CREATE POLICY "Clients can update own unassigned jobs" ON public.jobs
      FOR UPDATE USING (
        get_my_role() = 'client' AND client_id = auth.uid() AND status IN ('new', 'posted', 'pending')
      );
  END IF;
END $$;
