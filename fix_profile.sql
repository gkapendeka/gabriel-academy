INSERT INTO public.profiles (id, email, role, masked_id)
VALUES (
  '359f0580-4542-41bc-aac0-daa24d561ed2', 
  'gkapendeka@gmail.com', 
  'client', 
  'CL-' || LPAD(nextval('client_seq')::TEXT, 3, '0')
)
ON CONFLICT (id) DO NOTHING;
