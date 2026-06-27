INSERT INTO public.system_settings (setting_key, setting_value)
VALUES (
  'academic_taxonomy',
  '[{"level": "Primary School (CAPS)", "subjects": ["Mathematics", "English HL", "English FAL", "Afrikaans FAL", "Natural Sciences", "Social Sciences", "Life Skills"]}, {"level": "Secondary School (CAPS)", "subjects": ["Mathematics", "Mathematical Literacy", "Physical Sciences", "Life Sciences", "Accounting", "Business Studies", "Economics", "Geography", "History", "English HL", "English FAL", "Afrikaans FAL"]}, {"level": "University (Undergrad)", "subjects": ["Calculus", "Linear Algebra", "Physics", "Chemistry", "Computer Science", "Economics", "Statistics", "Accounting", "Psychology"]}]'::jsonb
)
ON CONFLICT (setting_key) DO NOTHING;
