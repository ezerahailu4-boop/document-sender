-- Run after creating the "documents" storage bucket (private).
-- The app's server-side API routes use the Supabase service-role key for uploads
-- and generate short-lived signed URLs for authorized file downloads.
--
-- Keep client-side access locked down so authenticated users cannot directly enumerate
-- or download confidential documents from storage without passing through the app's
-- department route authorization checks (/api/documents/[id]/file).

-- Service role has full management access for server-side uploads & signed URL generation
create policy "Service role manages documents bucket"
  on storage.objects for all
  to service_role
  using (bucket_id = 'documents')
  with check (bucket_id = 'documents');

-- Direct client-side access is intentionally disallowed.
-- All access must go through the Next.js API endpoints to enforce route-based access control.
