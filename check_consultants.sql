SELECT id, email, role, display_name, is_verified, created_at FROM public.profiles WHERE role = 'consultant' ORDER BY created_at DESC LIMIT 5;
