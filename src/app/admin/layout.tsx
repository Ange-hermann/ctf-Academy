import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { adminNavFor } from "@/config/admin-nav";
import { adminRoleLabels, requireStaff, type AdminRole } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s — Administration CTF ACADEMY" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const ctx = await requireStaff("/admin");
  const staffRoles = ctx.roles.filter((r): r is AdminRole => r !== "student");
  const user = {
    name: `${ctx.firstName} ${ctx.lastName}`.trim() || ctx.email,
    email: ctx.email,
    roleLabels: staffRoles.map((r) => adminRoleLabels[r]),
  };
  return (
    <AdminShell user={user} items={adminNavFor(ctx.roles)}>
      {children}
    </AdminShell>
  );
}
