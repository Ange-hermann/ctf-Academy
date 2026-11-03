import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getDb } from "@/lib/db";
import { methodLabels, paymentStatusLabels } from "@/lib/student/queries/finance";

const csv = (v: string | number | null | undefined) => `"${String(v ?? "").replaceAll('"', '""')}"`;

/** Export CSV de tous les paiements — rapport financier exploitable dans un tableur. */
export async function GET() {
  await requireAdminRoles(["admin", "finance"], adminRoutes.finance);
  const db = getDb();
  if (!db) return new Response("Base de données indisponible", { status: 503 });

  const rows = await db.payments.findMany({
    orderBy: { created_at: "desc" },
    take: 10_000,
    include: {
      profiles: { select: { first_name: true, last_name: true, email: true } },
      applications: { select: { reference: true, formations: { select: { name: true } } } },
      payment_schedules: { select: { label: true } },
      receipts: { select: { number: true } },
    },
  });

  const head = ["Date", "Référence dossier", "Étudiant", "E-mail", "Formation", "Échéance", "Montant (F CFA)", "Moyen", "Canal", "Référence canal", "Statut", "Reçu"];
  const lines = rows.map((p) =>
    [
      p.created_at.toISOString().slice(0, 10),
      p.applications.reference,
      `${p.profiles.first_name} ${p.profiles.last_name}`.trim(),
      p.profiles.email,
      p.applications.formations.name,
      p.payment_schedules?.label ?? "",
      p.amount,
      methodLabels[p.method] ?? p.method,
      p.provider,
      p.provider_reference ?? "",
      paymentStatusLabels[p.status],
      p.receipts?.number ?? "",
    ]
      .map(csv)
      .join(";"),
  );

  const body = `﻿${head.map(csv).join(";")}\n${lines.join("\n")}`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paiements-ctf-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
