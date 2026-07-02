import { getCurrentUser } from "../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS } from "@/lib/status";
import { FindByReference } from "./find-by-reference";

export default async function FindPage() {
  const user = await getCurrentUser();

  return (
    <>
      <Topbar
        title="Find a Document"
        subtitle="Search by reference number"
        userName={user.fullName}
        userRole={ROLE_LABELS[user.role]}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-2xl">
          <FindByReference />
        </div>
      </main>
    </>
  );
}
