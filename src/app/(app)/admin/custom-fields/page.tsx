import { getCurrentUser } from "../../actions";
import { Topbar } from "@/components/layout/topbar";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CustomFieldsManager } from "./custom-fields-manager";

export default async function AdminCustomFieldsPage() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") redirect("/dashboard");

  const customFields = await prisma.customField.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { documentCustomValues: true },
      },
    },
  });

  return (
    <>
      <Topbar
        title="Custom Fields"
        subtitle="Define global metadata fields for tracked documents"
        userName={user.fullName}
        userRole="Administrator"
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <CustomFieldsManager
            initialFields={customFields.map((f) => ({
              id: f.id,
              name: f.name,
              fieldType: f.fieldType,
              options: f.options,
              isRequired: f.isRequired,
              usageCount: f._count.documentCustomValues,
            }))}
          />
        </div>
      </main>
    </>
  );
}
