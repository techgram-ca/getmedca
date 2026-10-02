"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Spinner } from "@getmed/ui";
import { createClient } from "@getmed/db/browser";

const GENERIC =
  "Reset links work once and expire quickly, and they have to be opened on the device that asked for them.";

/**
 * Reads the URL fragment and, if it carries a session, hands it to Supabase.
 * Resolves to the reason it could not, or null once a session is established.
 *
 * Async all the way down so the caller only ever sets state from a `.then`.
 * Setting it in the body of an effect cascades a second render before the
 * first has painted, which is what `react-hooks/set-state-in-effect` is for.
 */
async function recover(): Promise<string | null> {
  const params = new URLSearchParams(window.location.hash.slice(1));

  const described = params.get("error_description");
  if (described) return described.replace(/\+/g, " ");

  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return GENERIC;

  const { error } = await createClient().auth.setSession({ access_token, refresh_token });
  return error ? error.message : null;
}

/**
 * Recovers a session from the URL fragment, for reset links that carry one.
 *
 * A link this app sends comes back as `?code=`, which the callback exchanges
 * on the server. A link sent from the Supabase dashboard instead returns
 * `#access_token=…&refresh_token=…` — a fragment, which browsers never put on
 * the wire, so no amount of server code can see it. Only the browser can, and
 * only by handing the pair back to Supabase here.
 *
 * Rendered when the server found no session, so an ordinary expired link ends
 * at the message below rather than spinning.
 */
export function RecoverFromHash() {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    recover().then((reason) => {
      if (cancelled) return;
      if (reason) {
        setFailure(reason);
        return;
      }
      // Drop the tokens from the address bar before anything can copy or log
      // the URL, then re-render the server component, which now sees a session.
      window.history.replaceState(null, "", window.location.pathname);
      router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!failure) {
    return (
      <div className="flex items-center gap-3 py-6 text-sm text-ink-500">
        <Spinner /> Checking your reset link…
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <Alert tone="warning" title="This link is no longer valid">
        {failure} Request a new one and it will work.
      </Alert>
      <Button asChild className="w-full">
        <Link href="/forgot-password">Send a new link</Link>
      </Button>
    </div>
  );
}
