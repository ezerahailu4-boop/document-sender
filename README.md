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

> **Note on Prisma 7:** this project uses Prisma 7, which moved connection
> URLs out of `prisma/schema.prisma` and into `prisma.config.ts`. Do
> **not** add `url` / `directUrl` back into the `datasource` block in
> `schema.prisma` — Prisma 7 hard-errors on that and it will break the
> Vercel build. `DATABASE_URL` and `DIRECT_URL` still come from your
> `.env` file / Vercel environment variables exactly as before; they're
> just read by `prisma.config.ts` (for the CLI) and `src/lib/prisma.ts`
> (for the app's runtime client via the `PrismaPg` adapter) instead.

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
- **Search**: the Master Ledger has a debounced search bar matching
  reference number, sender name/org, and subject (case-insensitive).
- **SLA / overdue tracking**: any document sitting in one department's
  inbox for `NEXT_PUBLIC_SLA_DAYS` (default 3) or more is flagged
  Overdue on both the Master Ledger and the Inbox, sorted to the top.
- **Corrections**: Registry staff and Admins can correct a registered
  document's sender, subject, or received date from its detail page. A
  reason is required and every correction is recorded in the audit
  trail as a diff (old value → new value).
- **Mobile navigation**: the sidebar collapses into a slide-over drawer
  below the `md` breakpoint, opened from a hamburger button in the
  Topbar — full navigation works on phones, not just desktop.
- **Return / reject**: a department can send a document back to
  whoever routed it to them (with a required reason), distinct from
  forwarding it onward. Recorded as a `RETURNED` audit event.
- **Archiving**: completed documents can be archived from the Master
  Ledger to keep it uncluttered. Archived items are hidden by default;
  toggle "Show archived" to bring them back, or restore one
  individually.
- **CSV export**: the Master Ledger has an Export CSV button that
  respects the current search query and archive filter.
- **Seed script**: `npm run seed` creates a starter set of departments
  (including one flagged as the GM's office) so a fresh install isn't
  a blank slate.
- **Admin Overview** (`/admin`): system-wide stats, an overdue feed
  across every department, and a recent-activity feed — the Admin's
  home page.
- **Audit Log** (`/admin/audit-log`): a paginated, system-wide table of
  every audit event across every document (registrations, forwards,
  returns, completions, corrections, archiving).
- **Inline user management**: Admins can edit a user's role and
  department directly from the Users table without leaving the page.
- **Password reset**: a full "Forgot password?" → emailed link →
  "Set a new password" flow via Supabase Auth, plus a "Change
  password" panel in Settings for already-signed-in users.
- **Design system**: rebuilt on shadcn/ui — Button, Input, Label,
  Textarea, Select, Card, Badge, Table, DropdownMenu, Separator, and
  Skeleton primitives, all theme-aware via CSS variables. The registry
  "stamp" terracotta accent from the original design carries through
  as the `primary` token; the GM/department navy carries through as
  `secondary`.
- **Dark mode**: full light/dark/system theme support via
  `next-themes`, toggled from the sun/moon icon in the Topbar next to
  the user menu. Every page, table, badge, and form uses semantic
  color tokens (`bg-card`, `text-muted-foreground`, `bg-destructive/10`,
  etc.) rather than hardcoded colors, so nothing was missed when
  switching themes.
