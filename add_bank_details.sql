ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}'::jsonb;
