"use client";

import { Children, useState } from "react";
import { cn } from "@/lib/utils";

/** Carrousel horizontal « coverflow » (mobile) : défilement natif à accroche, profondeur 3D légère. */
export function Coverflow({
  children,
  label,
  className,
  itemClassName = "w-[84vw] max-w-sm",
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
  itemClassName?: string;
}) {
  const items = Children.toArray(children);
  const [slide, setSlide] = useState(0);

  const onScroll = (e: React.UIEvent<HTMLUListElement>) => {
    const el = e.currentTarget;
    const first = el.firstElementChild as HTMLElement | null;
    if (first) setSlide(Math.round(el.scrollLeft / (first.offsetWidth + 16)));
  };

  return (
    <div className={className}>
      <ul
        aria-label={label}
        onScroll={onScroll}
        className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[8vw] pt-2 pb-6 [perspective:1000px] [scrollbar-width:none] sm:-mx-8"
      >
        {items.map((child, i) => {
          const offset = Math.max(-1, Math.min(1, i - slide));
          return (
            <li
              key={i}
              className={cn("shrink-0 snap-center transition-[transform,opacity] duration-500 ease-out-expo", itemClassName)}
              style={{ transform: `rotateY(${offset * -18}deg) scale(${offset === 0 ? 1 : 0.9})`, opacity: offset === 0 ? 1 : 0.65 }}
            >
              {child}
            </li>
          );
        })}
      </ul>
      <div aria-hidden className="flex justify-center gap-2">
        {items.map((_, i) => (
          <span
            key={i}
            className={cn("h-1.5 rounded-full transition-all duration-500", i === slide ? "w-6 bg-gradient-or" : "w-1.5 bg-blanc/20")}
          />
        ))}
      </div>
    </div>
  );
}
