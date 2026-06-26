CREATE POLICY "Clients can upload attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'job_attachments');
CREATE POLICY "Users can read attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'job_attachments');
