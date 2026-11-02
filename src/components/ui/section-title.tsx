import { cn } from "@/lib/utils";

type SectionTitleProps = {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
};

/** Titre de section : sur-titre doré, titre Cinzel, description. Entourer un mot de <em> pour le passer en or. */
export function SectionTitle({ eyebrow, title, description, align = "center", as: Tag = "h2", className }: SectionTitleProps) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p
          className={cn(
            "mb-4 inline-flex items-center gap-3 text-xs font-semibold tracking-[0.3em] text-or-light uppercase",
            align === "center" && "justify-center",
          )}
        >
          <span aria-hidden className="h-px w-8 bg-gradient-or" />
          {eyebrow}
          <span aria-hidden className={cn("h-px w-8 bg-gradient-or", align === "left" && "hidden")} />
        </p>
      )}
      <Tag className="text-3xl leading-tight tracking-wide text-blanc sm:text-4xl lg:text-5xl [&_em]:animate-shimmer [&_em]:text-gradient-or [&_em]:not-italic">
        {title}
      </Tag>
      {description && <div className="mt-5 text-lg text-blanc/70">{description}</div>}
    </div>
  );
}
