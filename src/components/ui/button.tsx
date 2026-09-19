import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark" | "accent";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-sky-600 text-white shadow-sm hover:bg-sky-700 focus-visible:outline-sky-600 active:scale-[0.99]",
  accent:
    "bg-amber-500 text-white shadow-sm hover:bg-amber-600 focus-visible:outline-amber-500 active:scale-[0.99]",
  secondary:
    "border border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-100 focus-visible:outline-zinc-500",
  ghost:
    "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-zinc-500",
  dark: "bg-zinc-950 text-white hover:bg-zinc-800 focus-visible:outline-zinc-950",
};

const baseClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

export function Button({
  className,
  variant = "primary",
  icon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={cn(baseClass, variants[variant], className)} {...props}>
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  className,
  variant = "primary",
  icon,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <a className={cn(baseClass, variants[variant], className)} {...props}>
      {icon}
      {children}
    </a>
  );
}
