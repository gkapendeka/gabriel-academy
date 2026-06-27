CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  extracted_role text;
  new_masked_id text;
  new_is_verified boolean;
BEGIN
  -- 1. Safely determine the user's role
  extracted_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');

  -- 2. Generate the masked ID and verification status
  IF extracted_role = 'client' THEN
    new_masked_id := 'CL-' || LPAD(nextval('client_seq')::TEXT, 3, '0');
    new_is_verified := true; -- Clients are active by default
  ELSIF extracted_role = 'consultant' THEN
    new_masked_id := 'C-' || LPAD(nextval('consultant_seq')::TEXT, 3, '0');
    new_is_verified := false; -- Consultants require manual verification
  ELSE
    new_masked_id := 'ADM-' || substr(md5(random()::text), 1, 6);
    new_is_verified := true; -- Admins are active by default
  END IF;

  -- 3. Safely insert the profile
  INSERT INTO public.profiles (id, email, role, masked_id, display_name, phone, qualification, subject_areas, years_experience, academic_level, linkedin_url, is_verified)
  VALUES (
    NEW.id,
    NEW.email,
    extracted_role,
    new_masked_id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'qualification',
    ARRAY[NEW.raw_user_meta_data->>'subjects'],
    NULLIF(NEW.raw_user_meta_data->>'years_experience', '')::INTEGER,
    NEW.raw_user_meta_data->>'academic_level',
    NEW.raw_user_meta_data->>'linkedin_url',
    new_is_verified
  );
  
  -- 4. Notify admins if a consultant applies
  IF extracted_role = 'consultant' THEN
    INSERT INTO public.notifications (user_id, title, body, type, link)
    SELECT id, 'New Consultant Application', COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || ' has applied to be a consultant.', 'alert', '/admin'
    FROM public.profiles
    WHERE role = 'admin';
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If anything fails (e.g. sequence missing, permission denied)
  -- Do NOT crash the signup process. Just return the user!
  RETURN NEW;
END;
$function$;

-- Retroactively fix all existing clients who were created as suspended
UPDATE public.profiles SET is_verified = true WHERE role = 'client' AND is_verified = false;
