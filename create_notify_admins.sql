CREATE OR REPLACE FUNCTION notify_admins(p_title text, p_body text, p_link text)
RETURNS void AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, type, link)
  SELECT id, p_title, p_body, 'alert', p_link
  FROM public.profiles
  WHERE role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
