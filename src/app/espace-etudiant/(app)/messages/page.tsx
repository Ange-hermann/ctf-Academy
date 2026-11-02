import Link from "next/link";
import { ArrowRight, ClipboardList, GraduationCap, LifeBuoy, Megaphone, MessagesSquare } from "lucide-react";
import { TicketForm } from "@/components/student/messages/ticket-form";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { studentRoutes } from "@/config/student-nav";
import { formatShortDate } from "@/lib/student/format";
import { getMessagesOverview, ticketStatusLabels } from "@/lib/student/queries/messages";
import { requireStudent } from "@/lib/student/session";
import { whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export const metadata = { title: "Messages et assistance" };

type Channel = {
  href: string;
  icon: typeof Megaphone;
  title: string;
  description: string;
  unread: number;
  total: number;
  preview: { line1: string; line2: string; at: string }[];
};

function ChannelCard({ c, timezone }: { c: Channel; timezone: string }) {
  return (
    <Link
      href={c.href}
      className="group flex flex-col rounded-3xl border border-line bg-gradient-card p-5 transition-colors hover:border-or/40 sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl border border-or/30 bg-or/10 text-or-light">
          <c.icon aria-hidden className="size-5" />
        </span>
        <h2 className="min-w-0 flex-1 truncate text-lg tracking-wide text-blanc">{c.title}</h2>
        {c.unread > 0 ? (
          <Badge tone="gold" dot>
            {c.unread} non lu{c.unread > 1 ? "s" : ""}
          </Badge>
        ) : (
          <span className="text-xs text-blanc/40 tabular">{c.total}</span>
        )}
      </div>
      <p className="mt-3 text-sm text-blanc/60">{c.description}</p>
      {c.preview.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-line pt-4">
          {c.preview.map((p, i) => (
            <li key={i} className="flex items-baseline gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-blanc/80">{p.line1}</span>
              <span className="hidden truncate text-xs text-blanc/45 sm:block">{p.line2}</span>
              <time className="shrink-0 text-xs text-blanc/40">{formatShortDate(p.at, timezone)}</time>
            </li>
          ))}
        </ul>
      )}
      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-or-light group-hover:text-or">
        Ouvrir <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export default async function MessagesPage() {
  const ctx = await requireStudent(studentRoutes.messages);
  const { trainer, administrative, announcements, tickets } = await getMessagesOverview(ctx);

  const channels: Channel[] = [
    {
      href: `${studentRoutes.messages}/annonces`,
      icon: Megaphone,
      title: "Annonces",
      description: "Nouvelles de l'Académie et de votre formation.",
      unread: announcements.unread,
      total: announcements.total,
      preview: announcements.items.map((a) => ({ line1: a.title, line2: a.body, at: a.publishedAt })),
    },
    {
      href: `${studentRoutes.messages}/formateurs`,
      icon: GraduationCap,
      title: "Formateurs",
      description: "Questions de cours, encadrement et accompagnement.",
      unread: trainer.unread,
      total: trainer.total,
      preview: trainer.threads.map((t) => ({ line1: t.subject, line2: t.lastMessage ?? "", at: t.updatedAt })),
    },
    {
      href: `${studentRoutes.messages}/administratif`,
      icon: ClipboardList,
      title: "Administratif",
      description: "Dossier, paiements, attestations et vie pratique.",
      unread: administrative.unread,
      total: administrative.total,
      preview: administrative.threads.map((t) => ({ line1: t.subject, line2: t.lastMessage ?? "", at: t.updatedAt })),
    },
  ];

  return (
    <>
      <StudentPageHeader
        title="Messages et assistance"
        description="Annonces de l'Académie, échanges avec vos formateurs et l'administration, et demandes d'assistance."
        crumbs={[{ label: "Messages et assistance", href: studentRoutes.messages }]}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {channels.map((c) => (
          <ChannelCard key={c.href} c={c} timezone={ctx.timezone} />
        ))}
      </div>

      {/* Assistance */}
      <section aria-labelledby="help-title" className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-3xl border border-line bg-gradient-card p-5 sm:p-6">
          <h2 id="help-title" className="flex items-center gap-2 font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
            <LifeBuoy aria-hidden className="size-4" /> Mes demandes d&rsquo;assistance
          </h2>
          {tickets.length === 0 ? (
            <p className="mt-4 text-sm text-blanc/55">
              Aucune demande pour le moment. Un souci technique ou une question urgente ? Écrivez-nous.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {tickets.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-noir-soft/50 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-blanc">{t.subject}</span>
                    <span className="text-xs text-blanc/45">
                      {t.category} · {formatShortDate(t.createdAt, ctx.timezone)}
                      {t.resolution ? ` — ${t.resolution}` : ""}
                    </span>
                  </span>
                  <Badge tone={t.status === "resolved" ? "success" : t.status === "in_progress" ? "gold" : "neutral"} dot>
                    {ticketStatusLabels[t.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <TicketForm />
        </div>

        <div className="flex flex-col justify-between rounded-3xl border border-or/30 bg-gradient-card p-5 sm:p-6">
          <div>
            <h2 className="flex items-center gap-2 font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
              <MessagesSquare aria-hidden className="size-4" /> Besoin d&rsquo;une réponse rapide ?
            </h2>
            <p className="mt-4 text-sm text-blanc/65">
              Pour les urgences (accès, paiement bloqué, séance en direct), l&rsquo;équipe répond aussi sur WhatsApp pendant les
              heures ouvrées.
            </p>
          </div>
          <a
            href={whatsappLink("Bonjour CTF ACADEMY, j'ai besoin d'aide dans mon espace étudiant.")}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-or/40 px-5",
              "font-semibold text-or-light transition-colors hover:bg-or/10",
            )}
          >
            Écrire sur WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}
