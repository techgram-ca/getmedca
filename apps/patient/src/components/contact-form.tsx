"use client";

import { useState } from "react";
import { Button, Field, FormError, Input, Textarea, toast } from "@getmed/ui";

export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Could not send your message");
      return;
    }
    setDone(true);
    toast.success("Message sent");
  }

  if (done) {
    return (
      <div className="text-center animate-fade-in">
        <p className="text-lg font-semibold">Thanks — we've got it.</p>
        <p className="mt-1 text-sm text-ink-600">We'll reply by email or phone within one business day.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={error} />
      <Field label="Your name" htmlFor="name" required>
        <Input id="name" name="name" required maxLength={120} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" maxLength={200} />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" maxLength={30} />
        </Field>
      </div>
      <Field label="Message" htmlFor="message" required>
        <Textarea id="message" name="message" required minLength={10} maxLength={2000} rows={5} />
      </Field>
      <Button type="submit" loading={busy} size="lg">Send message</Button>
    </form>
  );
}
