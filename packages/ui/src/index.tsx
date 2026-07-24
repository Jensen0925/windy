import type { ComponentPropsWithRef, HTMLAttributes, PropsWithChildren, ReactNode } from "react";

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

const BUTTON_VARIANT_CLASSES = {
  primary: "bg-sky-500 text-white hover:bg-sky-400 disabled:bg-slate-600",
  secondary: "bg-slate-800/90 text-slate-100 hover:bg-slate-700 disabled:text-slate-500",
  ghost: "bg-transparent text-slate-100 hover:bg-white/10 disabled:text-slate-500",
} as const;

const BUTTON_SIZE_CLASSES = {
  sm: "h-8 gap-1.5 rounded-md px-3 text-xs",
  md: "h-10 gap-2 rounded-lg px-4 text-sm",
  lg: "h-12 gap-2.5 rounded-xl px-5 text-base",
  icon: "size-10 rounded-lg",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANT_CLASSES;
export type ButtonSize = keyof typeof BUTTON_SIZE_CLASSES;

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  children,
  className,
  type = "button",
  variant = "secondary",
  size = "md",
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      className={classNames(
        "inline-flex select-none items-center justify-center font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60",
        BUTTON_VARIANT_CLASSES[variant],
        BUTTON_SIZE_CLASSES[size],
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonProps, "aria-label" | "children" | "size"> {
  "aria-label": string;
  children: ReactNode;
  size?: Extract<ButtonSize, "sm" | "md" | "lg" | "icon">;
}

export function IconButton({ children, size = "icon", ...props }: IconButtonProps) {
  return (
    <Button size={size} {...props}>
      {children}
    </Button>
  );
}

export type PanelProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export function Panel({ children, className, ...props }: PanelProps) {
  return (
    <div
      className={classNames(
        "rounded-2xl border border-white/10 bg-slate-950/80 text-slate-100 shadow-2xl",
        "backdrop-blur-xl",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type BadgeProps = PropsWithChildren<HTMLAttributes<HTMLSpanElement>>;

export function Badge({ children, className, ...props }: BadgeProps) {
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full bg-white/10 px-2 py-1 text-xs font-medium",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
