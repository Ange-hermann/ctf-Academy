import { cn } from "@/lib/utils";

type CardProps = React.ComponentProps<"div"> & { interactive?: boolean };

export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-line bg-gradient-card p-6 text-blanc",
        "transition-[box-shadow,border-color,transform] duration-500 ease-out-expo",
        interactive && "hover:-translate-y-1 hover:border-or/40 hover:shadow-gold-lg",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("font-display text-xl tracking-wide text-blanc", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-blanc/70", className)} {...props} />;
}
