CREATE OR REPLACE FUNCTION log_job_milestone()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO messages (job_id, body, is_internal, sender_id)
    VALUES (NEW.id, '[MILESTONE]: ' || NEW.status, true, NULL);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_job_milestone ON jobs;

CREATE TRIGGER trigger_log_job_milestone
AFTER UPDATE OF status ON jobs
FOR EACH ROW
EXECUTE FUNCTION log_job_milestone();
