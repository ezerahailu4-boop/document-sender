import { getCurrentUser } from "../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS } from "@/lib/status";
import { ChangePasswordPanel } from "./change-password-panel";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  return (
    <>
      <Topbar title="Settings" userName={user.fullName} userRole={ROLE_LABELS[user.role]} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Account</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="text-foreground">{user.fullName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="text-foreground">{user.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Role</dt>
                <dd className="text-foreground">{ROLE_LABELS[user.role]}</dd>
              </div>
              {user.department && (
                <div>
                  <dt className="text-muted-foreground">Department</dt>
                  <dd className="text-foreground">{user.department.name}</dd>
                </div>
              )}
            </dl>
          </div>

          <ChangePasswordPanel />
        </div>
      </main>
    </>
  );
}
