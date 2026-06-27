-- 1. Ensure the sequences exist for IDs
CREATE SEQUENCE IF NOT EXISTS client_seq START 1;
CREATE SEQUENCE IF NOT EXISTS consultant_seq START 1;

-- 2. Backfill any missing profiles for users who successfully signed up but failed the trigger
INSERT INTO public.profiles (id, email, role, display_name, masked_id)
SELECT 
  au.id, 
  au.email, 
  COALESCE(au.raw_user_meta_data->>'role', 'client'),
  COALESCE(au.raw_user_meta_data->>'full_name', 'Client'),
  CASE 
    WHEN COALESCE(au.raw_user_meta_data->>'role', 'client') = 'client' THEN 'CL-' || LPAD(nextval('client_seq')::TEXT, 3, '0')
    WHEN COALESCE(au.raw_user_meta_data->>'role', 'client') = 'consultant' THEN 'C-' || LPAD(nextval('consultant_seq')::TEXT, 3, '0')
    ELSE 'ADM-' || substr(md5(random()::text), 1, 6)
  END
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- 3. Ensure users can actually insert their own profiles if the trigger fails (Fallback)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());
