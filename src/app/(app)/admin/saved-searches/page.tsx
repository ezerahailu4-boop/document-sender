import { getCurrentUser } from "../../actions";
import { Topbar } from "@/components/layout/topbar";
import { redirect } from "next/navigation";
import { SavedSearches } from "@/components/saved-searches";

export default async function AdminSavedSearchesPage() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <>
      <Topbar
        title="Saved Searches"
        subtitle="Manage and share your saved searches"
        userName={user.fullName}
        userRole={user.role === "ADMIN" ? "Administrator" : user.role}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <SavedSearches />
        </div>
      </main>
    </>
  );
}
