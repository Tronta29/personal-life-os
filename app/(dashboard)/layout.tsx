import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-server";
import { AppShell } from "@/components/shared/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) redirect("/login");

  return <AppShell>{children}</AppShell>;
}
