"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-soft focus-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          // shadow-brand carries the geometry; shadow-brand-600/30 re-colours it from
          // the brand token, so pharmacy-themed pages glow in their own colour.
          "bg-brand-600 text-white hover:bg-brand-700 hover:-translate-y-px hover:shadow-brand hover:shadow-brand-600/30",
        secondary: "bg-brand-100 text-brand-800 hover:bg-brand-200",
        outline: "border-2 border-ink-200 bg-white text-ink-700 hover:border-brand-600 hover:text-brand-700",
        ghost: "text-ink-600 hover:bg-brand-50 hover:text-brand-700",
        danger: "bg-danger-500 text-white hover:bg-red-700",
        accent: "bg-accent-400 text-ink-950 hover:bg-accent-500",
        white: "bg-white text-brand-600 font-bold hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)]",
        link: "text-brand-700 underline-offset-4 hover:underline rounded-md",
      },
      size: {
        sm: "h-9 px-4 text-sm [&_svg]:size-4",
        md: "h-11 px-6 text-sm [&_svg]:size-4",
        lg: "h-13 px-8 text-base [&_svg]:size-5",
        icon: "size-10 [&_svg]:size-5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  /** Text shown next to the spinner while `loading`. Falls back to the button's children. */
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingText, children, disabled, ...props }, ref) => {
    if (asChild) {
      // Slot requires exactly one child; loading state is not supported with asChild.
      return (
        <Slot ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {loading && loadingText ? loadingText : children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
