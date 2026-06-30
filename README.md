# DocTrack — Inbound Document Tracking & Workflow Automation System

Replaces an Outlook-based registry process. Built with Next.js 14 (App
Router), TypeScript, Tailwind, Supabase (Auth + Postgres + Storage), and
Prisma.

## Workflow

1. **Registry staff** upload the scanned PDF + sender/subject info. The
   system generates a reference number (e.g. `TAF/IN/2026/001`) and routes
   the document to the **GM's office** automatically — every document's
   first stop.
2. The **GM** reviews it and forwards it to the relevant **department**.
3. That department can act on it, **mark it Completed**, or **forward it
   again** to another department if needed.
4. **Admin** sees everything on the Master Ledger, and manages
   Departments (including which one is flagged as the GM's office) and
   Users (creating accounts, assigning roles).

Every hop is logged in a per-document audit trail, and recipients get
both an in-app and email notification when something lands in their
inbox.

## Roles

| Role | Can do |
|---|---|
| `REGISTRY_STAFF` | Register new documents, view the Master Ledger |
| `GM` | Inbox — review & forward documents (first stop) |
| `DEPARTMENT_USER` / `DEPARTMENT_HEAD` | Inbox — review, forward, or complete documents |
| `ADMIN` | Everything above, plus manage Departments & Users |

## Setup

### 1. Supabase project

Create a project at supabase.com, then:

- **Storage**: create a bucket named `documents` (private, not public).
- **SQL editor**: run `supabase/storage-policy.sql` and
  `supabase/rls.sql` (included in this repo) to lock down storage and
  enforce row-level security.
- Copy your Project URL, anon key, and service role key into `.env`
  (see `.env.example`).

### 2. Database

```bash
cp .env.example .env
# fill in DATABASE_URL / DIRECT_URL with your Supabase connection strings
npx prisma generate
npx prisma db push
```

### 3. Create the first Admin

Easiest path: create a user directly in Supabase Auth (Dashboard ->
Authentication -> Add user), then insert a matching profile row:

```sql
insert into users ("id", "authId", "fullName", "email", "role", "isActive")
values (gen_random_uuid()::text, '<auth-user-id-from-supabase>', 'Your Name', 'you@institution.org', 'ADMIN', true);
```

Sign in at `/login` — you'll land on the Master Ledger. From **Admin ->
Departments**, create your departments and mark one as the GM's office.
From **Admin -> Users**, create accounts for Registry staff, the GM, and
each department.

### 4. Run locally

```bash
npm install
npm run dev
```

### 5. Deploy

Push to GitHub, import into Vercel, set the same environment variables
from `.env.example` in the Vercel project settings, and deploy. Run
`npx prisma db push` once against the production database before first
use.

## Notes

- Uploaded PDFs are validated by magic-byte sniffing (not just file
  extension) and renamed to their reference number before storage —
  never trusts the original filename.
- Reference numbers are generated with a single atomic SQL
  `UPDATE ... RETURNING`, so two simultaneous registrations can never
  collide (see `src/lib/reference-number.ts`).
- Email notifications use Resend — set `RESEND_API_KEY` and
  `EMAIL_FROM`. Notifications still work in-app even if email isn't
  configured; failures are recorded but never block routing.
