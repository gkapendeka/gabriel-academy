ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_data JSONB DEFAULT '{}'::jsonb;
