# TAF Energies Doc Tracker — Inbound Document Tracking & Workflow Automation System

Replaces an Outlook-based registry process. Built with Next.js 14 (App
Router), TypeScript, Tailwind, Supabase (Auth + Postgres + Storage), and
Prisma.

## Workflow

1. **Registry staff** upload the scanned document + sender/subject info,
   then choose where it goes: the **GM's office** (default), or a
   **specific department** — optionally targeting one named person within
   that department. A reference number (e.g. `TAF/IN/2026/001`) is
   generated automatically either way.
2. If routed to the GM: the **GM** reviews it from their dedicated
   `/gm` overview page and forwards it on. When the GM forwards, they
   search for and pick a **specific person** by name (not just a
   department) — the document lands directly in that person's inbox.
3. That person can act on it, **mark it Completed**, **forward it
   again** (to a department, same as Registry), or **return it** with a
   reason if it landed on them by mistake.
4. **Admin** sees everything on the Master Ledger, manages Departments
   (including which one is flagged as the GM's office) and Users.
5. Anyone can **find a document instantly** by reference number from
   the Find Document page — department users only see documents that
   have passed through their own department; Registry/Admin see
   everything.

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

- **Rebrand**: the app is now "TAF Energies Doc Tracker" throughout —
  page title, sidebar, login, password reset pages, and outbound
  notification emails.
- **Flexible routing at registration**: Registry chooses one of three
  options for every new document — the GM's office (default), a
  specific department (optionally targeting one named person within
  it), or **a specific person directly** by searching across every
  registered user institution-wide, same as the GM's forward flow.
- **GM's Office page** (`/gm`): a dedicated dashboard for the GM role
  showing stats, average turnaround time, current overdue items, and
  full history of everything ever routed through that office.
- **GM forwards to a person, not just a department**: when the GM
  forwards a document, they search across all registered users by name
  (not a department dropdown) — the document lands directly in that
  person's inbox and only they get notified.
- **Find Document** (`/find`): quick reference-number lookup available
  to every role, with access scoped the same way as elsewhere
  (department users only see documents that passed through their own
  department).

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
