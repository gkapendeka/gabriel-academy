INSERT INTO public.profiles (id, email, role, display_name, phone, qualification, subject_areas, masked_id, is_verified, created_at)
VALUES (
  '82b5a3ad-2e12-45e6-a856-6ee1613ffdd0',
  'ginashetraining@gmail.com',
  'consultant',
  'Ginashe',
  '0825306948',
  'MBA',
  ARRAY['Accounting, English, Shona, Maths Geography'],
  'C-' || LPAD(nextval('consultant_seq')::TEXT, 3, '0'),
  false,
  '2026-06-27 09:22:42.463508+00'
);
