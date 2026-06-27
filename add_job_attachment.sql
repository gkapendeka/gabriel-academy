CREATE OR REPLACE FUNCTION public.add_job_attachment(p_job_id UUID, p_attachment JSONB)
RETURNS VOID AS $$
BEGIN
  -- Verify the user owns the job
  IF NOT EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE id = p_job_id 
    AND client_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Append the attachment
  UPDATE public.jobs
  SET attachments = COALESCE(attachments, '[]'::jsonb) || p_attachment
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
