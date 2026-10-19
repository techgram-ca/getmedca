import Link from "next/link";
import { Button } from "@getmed/ui";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<typeof Button>;

/**
 * An order or consultation button that knows whether the page can be acted on.
 *
 * Two things disable these: the site being closed before launch, and the
 * pharmacy itself being unlisted — the demo page shown to prospects. Either
 * way they are disabled rather than removed. A pharmacy looking at its own
 * page should see what patients will see, laid out as it will be — a page with
 * the buttons cut out of it is a different page, and the pharmacy cannot judge
 * it. Disabled also tells a patient who arrives early that the thing exists
 * and is not yet ready, which "nothing here" does not.
 *
 * The APIs refuse independently. This is presentation; it is not the lock.
 */
export function ActionButton({
  href,
  disabled,
  disabledTitle = "Not available yet",
  children,
  ...props
}: Omit<ButtonProps, "asChild" | "disabled"> & { href: string; disabled?: boolean; disabledTitle?: string }) {
  if (disabled) {
    return (
      <Button {...props} disabled aria-disabled="true" title={disabledTitle}>
        {children}
      </Button>
    );
  }
  return (
    <Button {...props} asChild>
      <Link href={href}>{children}</Link>
    </Button>
  );
}
