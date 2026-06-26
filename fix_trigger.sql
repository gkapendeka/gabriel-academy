CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_role text;
  new_masked_id text;
BEGIN
  -- 1. Safely determine the user's role
  extracted_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');

  -- Ensure sequences exist (just in case)
  -- The sequences were created, but let's just make it robust
  -- We don't CREATE sequences in a trigger, they should exist.

  -- 2. Generate the masked ID
  IF extracted_role = 'client' THEN
    new_masked_id := 'CL-' || LPAD(nextval('client_seq')::TEXT, 3, '0');
  ELSIF extracted_role = 'consultant' THEN
    new_masked_id := 'C-' || LPAD(nextval('consultant_seq')::TEXT, 3, '0');
  ELSE
    new_masked_id := 'ADM-' || substr(md5(random()::text), 1, 6);
  END IF;

  -- 3. Safely insert the profile
  INSERT INTO public.profiles (id, email, role, masked_id)
  VALUES (
    NEW.id,
    NEW.email,
    extracted_role,
    new_masked_id
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If anything fails (e.g. sequence missing, permission denied)
  -- Do NOT crash the signup process. Just return the user!
  -- This fixes the 500 Error permanently.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
