import { BadgeCheck, Clock3, HandHeart } from "lucide-react";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { Badge, ExampleBadge } from "@/components/ui/badge";
import { formationBase } from "@/config/student-nav";
import { formatDate } from "@/lib/student/format";
import { getServiceRecords } from "@/lib/student/queries/formation";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Reconnaissance du service" };
const HREF = `${formationBase.eds}/service`;
const fmtHours = (h: number) => `${h.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h`;

export default async function EdsServicePage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "eds") {
    return <WrongFormation expected="l'École des STAFs" current={ctx.enrollment.formationName} />;
  }
  const service = await withStudent(ctx.userId, (tx) => getServiceRecords(tx));
  const pendingHours = service.totalHours - service.recognizedHours;

  return (
    <>
      <StudentPageHeader
        title="Reconnaissance du service"
        eyebrow="École des STAFs"
        description="Vos heures de service consignées par l'équipe. Elles comptent pour la graduation une fois reconnues."
        crumbs={[{ label: "Reconnaissance du service", href: HREF }]}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Heures reconnues", value: fmtHours(service.recognizedHours), icon: BadgeCheck },
          { label: "En attente de reconnaissance", value: fmtHours(pendingHours), icon: Clock3 },
          { label: "Total déclaré", value: fmtHours(service.totalHours), icon: HandHeart },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-3xl border border-line bg-gradient-card p-5">
            <div className="flex items-center gap-2 text-sm text-blanc/55">
              <Icon aria-hidden className="size-4 text-or" /> {label}
            </div>
            <p className="mt-2 text-2xl font-semibold text-or-light">{value}</p>
          </div>
        ))}
      </div>

      {service.items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={HandHeart}
            title="Aucun service consigné"
            description="Vos activités de service seront enregistrées ici par l'équipe, puis reconnues pour la graduation."
          />
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {service.items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-gradient-card px-4 py-3.5">
              <span className="grid size-10 place-items-center rounded-xl border border-or/30 bg-or/10 text-or-light">
                <HandHeart aria-hidden className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-blanc">{r.activity}</p>
                <p className="text-sm text-blanc/55">
                  {r.department ? `${r.department} · ` : ""}
                  {formatDate(r.servedOn, ctx.timezone)} · {fmtHours(r.hours)}
                </p>
              </div>
              <Badge tone={r.recognized ? "success" : "warning"} dot>
                {r.recognized ? "Reconnu" : "En attente"}
              </Badge>
              {r.isExample && <ExampleBadge />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
