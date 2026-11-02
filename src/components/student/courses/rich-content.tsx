import { Fragment } from "react";

/** Mise en forme simple et sûre (aucun HTML injecté) : titres « ## », listes « - », citations « > », **gras**. */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-blanc">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export function RichContent({ source }: { source: string }) {
  const blocks = source.replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-5 text-[1.05rem] leading-relaxed text-blanc/80">
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h2 key={i} className="pt-2 text-2xl tracking-wide text-blanc">
              {block.slice(3)}
            </h2>
          );
        }
        if (block.startsWith("> ")) {
          return (
            <blockquote key={i} className="rounded-r-2xl border-l-2 border-or bg-or/5 px-5 py-3 text-blanc/70 italic">
              {inline(block.replace(/^> /gm, ""))}
            </blockquote>
          );
        }
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="space-y-2">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-3">
                  <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-or" />
                  <span>{inline(l.slice(2))}</span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{inline(block)}</p>;
      })}
    </div>
  );
}
