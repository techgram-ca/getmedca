import Link from "next/link";
import { Button } from "@getmed/ui";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<typeof Button>;

/**
 * An order or consultation button that knows whether the site is open.
 *
 * Before launch these are disabled rather than removed. A pharmacy looking at
 * its own page should see what patients will see, laid out as it will be — a
 * page with the buttons cut out of it is a different page, and the pharmacy
 * cannot judge it. Disabled also tells a patient who arrives early that the
 * thing exists and is not yet ready, which "nothing here" does not.
 *
 * The APIs refuse independently. This is presentation; it is not the lock.
 */
export function ActionButton({
  href,
  disabled,
  children,
  ...props
}: Omit<ButtonProps, "asChild" | "disabled"> & { href: string; disabled?: boolean }) {
  if (disabled) {
    return (
      <Button {...props} disabled aria-disabled="true" title="Opening soon">
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
