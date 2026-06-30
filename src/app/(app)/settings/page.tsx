import { getCurrentUser } from "../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS } from "@/lib/status";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  return (
    <>
      <Topbar title="Settings" userName={user.fullName} userRole={ROLE_LABELS[user.role]} />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-xl rounded-lg border border-rule bg-paper-raised p-5 shadow-sm">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-ink-soft">Name</dt>
              <dd className="text-ink">{user.fullName}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Email</dt>
              <dd className="text-ink">{user.email}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Role</dt>
              <dd className="text-ink">{ROLE_LABELS[user.role]}</dd>
            </div>
          </dl>
        </div>
      </main>
    </>
  );
}
