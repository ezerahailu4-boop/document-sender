import { getCurrentUser } from "../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS } from "@/lib/status";
import { FindByReference } from "./find-by-reference";
import { SavedSearches } from "@/components/saved-searches";

export default async function FindPage({ searchParams }: { searchParams: Promise<{ query?: string }> }) {
  const user = await getCurrentUser();
  const { query = "" } = await searchParams;

  return (
    <>
      <Topbar
        title="Find a Document"
        subtitle="Search by reference number or use saved searches"
        userName={user.fullName}
        userRole={ROLE_LABELS[user.role]}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground mb-2">Search by Reference</h2>
            <FindByReference initialQuery={query} />
          </div>
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">Saved Searches</h2>
            <SavedSearches />
          </div>
        </div>
      </main>
    </>
  );
}