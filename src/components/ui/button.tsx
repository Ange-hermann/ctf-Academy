import { cloneElement, isValidElement, type ReactElement } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "group/btn relative isolate inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap",
    "rounded-2xl font-semibold tracking-wide select-none",
    "transition-[box-shadow,transform,background-color,border-color,color] duration-300 ease-out-expo",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-or",
    "[&_svg]:size-5 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-gradient-or text-noir shadow-gold hover:shadow-gold-lg",
        outline:
          "border border-or/40 bg-noir-soft/60 text-or-light hover:border-or hover:bg-or/10 hover:shadow-gold",
        ghost: "text-blanc/80 hover:text-or-light hover:bg-or/10",
        danger: "border border-danger/40 bg-danger/10 text-danger-light hover:bg-danger/20",
      },
      size: {
        sm: "min-h-11 px-4 text-sm",
        md: "min-h-12 px-6 text-base",
        lg: "min-h-14 px-8 text-lg",
        icon: "size-11 rounded-full",
      },
      halo: { true: "animate-halo", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", halo: false },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

const Shine = () => (
  <span
    aria-hidden
    className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/3 -translate-x-[120%] bg-linear-to-r from-transparent via-white/55 to-transparent group-hover/btn:animate-shine"
  />
);

export function Button({ className, variant, size, halo, asChild = false, children, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, halo }), className);
  const shine = (variant ?? "primary") === "primary" ? <Shine /> : null;

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string; children?: React.ReactNode }>;
    return cloneElement(
      child,
      { ...(props as object), className: cn(classes, child.props.className) },
      <>
        {child.props.children}
        {shine}
      </>,
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
      {shine}
    </button>
  );
}
