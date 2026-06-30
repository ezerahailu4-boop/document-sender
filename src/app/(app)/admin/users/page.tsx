import { getCurrentUser } from "../../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UsersManager } from "./users-manager";

export default async function UsersAdminPage() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [users, departments] = await Promise.all([
    prisma.user.findMany({ include: { department: true }, orderBy: { createdAt: "desc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Topbar
        title="Users"
        subtitle="Create accounts and assign roles & departments"
        userName={user.fullName}
        userRole={ROLE_LABELS[user.role]}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          <UsersManager initialUsers={users} departments={departments} />
        </div>
      </main>
    </>
  );
}
