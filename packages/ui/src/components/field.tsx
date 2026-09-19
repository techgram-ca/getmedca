import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { AlertCircle } from "lucide-react";
import { cn } from "../lib/cn";

export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn("text-sm font-semibold text-ink-800", className)} {...props} />
));
Label.displayName = "Label";

/**
 * Labelled form control. When `error` is set the label turns red and the
 * message is shown at readable size with an icon, so it is obvious both which
 * field failed and why.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  optional,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  return (
    <div className={cn("space-y-1.5", className)} data-invalid={error ? "true" : undefined}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor} className={cn(error && "text-danger-500")}>
          {label}
          {required ? <span className="ml-0.5 text-danger-500">*</span> : null}
        </Label>
        {optional ? <span className="text-xs text-ink-400">Optional</span> : null}
      </div>
      {children}
      {error ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-sm font-medium text-danger-500 animate-fade-in">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

/** Prominent form-level error banner. */
export function FormError({ message, title }: { message?: string | null; title?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger-500/40 bg-danger-100 px-4 py-3 animate-fade-in">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger-500" aria-hidden />
      <div>
        {title ? <p className="text-sm font-bold text-red-900">{title}</p> : null}
        <p className={cn("text-sm text-red-800", title && "mt-0.5")}>{message}</p>
      </div>
    </div>
  );
}

export type FieldIssue = { field: string; label: string; message: string };

/**
 * Summary of every failed field, shown above a form. Each entry focuses and
 * scrolls to its control, so long forms tell the user exactly what to fix.
 */
export function FormErrorSummary({
  issues,
  title = "Please fix the following before continuing",
  className,
}: {
  issues: FieldIssue[];
  title?: string;
  className?: string;
}) {
  if (issues.length === 0) return null;
  return (
    <div
      role="alert"
      tabIndex={-1}
      data-error-summary
      className={cn("rounded-2xl border border-danger-500/40 bg-danger-100 p-4 animate-fade-in", className)}
    >
      <p className="flex items-center gap-2 text-sm font-bold text-red-900">
        <AlertCircle className="size-5 shrink-0 text-danger-500" aria-hidden />
        {title}
      </p>
      <ul className="mt-2 space-y-1 pl-7">
        {issues.map((i) => (
          <li key={`${i.field}-${i.message}`} className="list-disc text-sm text-red-800 marker:text-danger-500">
            <button
              type="button"
              className="text-left underline-offset-2 hover:underline"
              onClick={() => {
                const el = document.getElementById(i.field);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
                (el as HTMLInputElement | null)?.focus?.();
              }}
            >
              <span className="font-semibold">{i.label}:</span> {i.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Scrolls to the form's error summary (or first invalid field) after a failed submit. */
export function focusFirstError(container?: HTMLElement | null) {
  const root = container ?? document;
  const summary = root.querySelector<HTMLElement>("[data-error-summary]");
  if (summary) {
    summary.scrollIntoView({ behavior: "smooth", block: "center" });
    summary.focus({ preventScroll: true });
    return;
  }
  const firstInvalid = root.querySelector<HTMLElement>('[data-invalid="true"] input, [data-invalid="true"] select, [data-invalid="true"] textarea');
  firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
  firstInvalid?.focus({ preventScroll: true });
}
