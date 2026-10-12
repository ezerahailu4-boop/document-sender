import { getCurrentUser } from "../../actions";
import { Topbar } from "@/components/layout/topbar";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TagsManager } from "./tags-manager";

export default async function AdminTagsPage() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") redirect("/dashboard");

  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { documents: true },
      },
    },
  });

  return (
    <>
      <Topbar
        title="Manage Tags"
        subtitle="Configure organizational tags and labels for documents"
        userName={user.fullName}
        userRole="Administrator"
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <TagsManager
            initialTags={tags.map((t) => ({
              id: t.id,
              name: t.name,
              color: t.color,
              documentCount: t._count.documents,
            }))}
          />
        </div>
      </main>
    </>
  );
}
