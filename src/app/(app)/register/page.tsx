import { getCurrentUser } from "../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS } from "@/lib/status";
import { redirect } from "next/navigation";
import { RegisterForm } from "./register-form";
import { prisma } from "@/lib/prisma";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user.role !== "REGISTRY_STAFF" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const gmDept = await prisma.department.findFirst({ where: { isGmOffice: true } });

  return (
    <>
      <Topbar
        title="Register Document"
        subtitle="Every new document is routed to the GM's office first"
        userName={user.fullName}
        userRole={ROLE_LABELS[user.role]}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          {!gmDept && (
            <div className="mb-4 rounded-md bg-warning/15 px-4 py-3 text-sm text-warning">
              No GM office is configured yet. An Admin needs to mark one department as the
              GM&apos;s office in Departments settings before documents can be registered.
            </div>
          )}
          <RegisterForm gmDeptName={gmDept?.name ?? null} />
        </div>
      </main>
    </>
  );
}
