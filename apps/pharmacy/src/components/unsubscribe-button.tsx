"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Alert, Button } from "@getmed/ui";
import { unsubscribe } from "@/lib/actions/outreach";

type State = { ok?: true; error?: string } | null;

export function UnsubscribeButton({ token }: { token: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<State, FormData>(unsubscribe, null);

  useEffect(() => {
    // Re-render the page, which now reads the stored unsubscribe and says so.
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="token" value={token} />
      {state?.error ? <Alert tone="danger" className="mb-4">{state.error}</Alert> : null}
      <Button type="submit" size="lg" className="w-full" loading={pending} loadingText="Unsubscribing…">
        Yes, unsubscribe
      </Button>
    </form>
  );
}
