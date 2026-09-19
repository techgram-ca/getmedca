import * as React from "react";
import { cn } from "../lib/cn";

const base =
  "flex w-full rounded-xl border bg-white text-ink-900 placeholder:text-ink-400 outline-none transition-soft focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:opacity-60";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, invalid, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    aria-invalid={invalid || undefined}
    className={cn(
      base,
      "h-12 px-4 text-sm",
      "file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-800",
      invalid ? "border-danger-500 bg-red-50/40 focus:border-danger-500 focus:ring-danger-500/15" : "border-ink-200",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        base,
        "min-h-24 px-4 py-3 text-sm",
        invalid ? "border-danger-500 bg-red-50/40 focus:border-danger-500 focus:ring-danger-500/15" : "border-ink-200",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  ({ className, invalid, children, ...props }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        base,
        "h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b8280%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_1rem_center] bg-no-repeat px-4 pr-10 text-sm",
        invalid ? "border-danger-500 bg-red-50/40" : "border-ink-200",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";
