import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentUser } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar role={user.role} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
