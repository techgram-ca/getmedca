"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button, Card, CardContent, FormError, Turnstile, cn, toast } from "@getmed/ui";

type Props = { kind: "order" | "consultation"; targetId: string; maskedPhone: string; successHref: string; failureHref: string };

export function OtpForm({ kind, targetId, maskedPhone, successHref, failureHref }: Props) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(30);
  const [turnstile, setTurnstile] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const base = kind === "order" ? `/api/orders/${targetId}` : `/api/consultations/${targetId}`;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const code = digits.join("");

  async function verify(c = code) {
    if (c.length !== 6) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`${base}/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: c }) });
    const j = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    setBusy(false);
    if (res.ok) {
      router.push(successHref);
      return;
    }
    if (j.code === "otp_locked") {
      router.push(failureHref);
      return;
    }
    setError(j.error ?? "Verification failed");
    setDigits(Array(6).fill(""));
    inputs.current[0]?.focus();
  }

  async function resend() {
    setBusy(true);
    const res = await fetch(`${base}/otp`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ turnstileToken: turnstile }) });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(j.error ?? "Could not resend");
      return;
    }
    toast.success("New code sent");
    setCooldown(30);
  }

  const onChange = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "");
    if (!clean) {
      setDigits((d) => d.map((x, idx) => (idx === i ? "" : x)));
      return;
    }
    const next = [...digits];
    clean.split("").slice(0, 6 - i).forEach((ch, k) => (next[i + k] = ch));
    setDigits(next);
    const target = Math.min(i + clean.length, 5);
    inputs.current[target]?.focus();
    if (next.every((d) => d)) void verify(next.join(""));
  };

  return (
    <Card>
      <CardContent className="space-y-5 p-7">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><MessageSquare className="size-6" /></div>
        <div>
          <h1 className="text-xl font-semibold">Enter the code we texted you</h1>
          <p className="mt-1 text-sm text-ink-600">Sent to {maskedPhone}. It expires in 10 minutes.</p>
        </div>
        <FormError message={error} />
        <div className="flex justify-between gap-2" onPaste={(e) => { e.preventDefault(); onChange(0, e.clipboardData.getData("text")); }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={6}
              value={d}
              autoFocus={i === 0}
              aria-label={`Digit ${i + 1}`}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
              }}
              className={cn("h-14 w-12 rounded-xl border border-ink-200 bg-white text-center text-2xl font-semibold tabular-nums transition-soft focus-ring focus:border-brand-400", error && "border-danger-500")}
            />
          ))}
        </div>
        <Button size="lg" className="w-full" loading={busy} onClick={() => verify()} disabled={code.length !== 6}>Verify</Button>
        <Turnstile onToken={setTurnstile} />
        <p className="text-center text-sm text-ink-500">
          Didn't get it?{" "}
          <button type="button" className="font-medium text-brand-700 disabled:text-ink-400" disabled={cooldown > 0 || busy} onClick={resend}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        </p>
      </CardContent>
    </Card>
  );
}
