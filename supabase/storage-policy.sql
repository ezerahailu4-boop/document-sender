-- Run after creating the "documents" storage bucket (private).
-- Only authenticated users may read/write; the app's API routes use the
-- service-role key for uploads and signed URLs, so these policies mainly
-- guard against direct client-side access bypassing the app.

create policy "Authenticated users can read documents bucket"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents');

create policy "Service role manages documents bucket"
  on storage.objects for all
  to service_role
  using (bucket_id = 'documents')
  with check (bucket_id = 'documents');
