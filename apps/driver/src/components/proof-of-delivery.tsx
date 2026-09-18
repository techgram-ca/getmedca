"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { Camera, Eraser, Check } from "lucide-react";
import { Button, Card, CardContent, FormError, toast } from "@getmed/ui";

/** Camera capture (PWA) + canvas signature pad → POST /api/orders/[id]/deliver. */
export function ProofOfDelivery({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pad = useRef<SignaturePad | null>(null);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = pad.current?.toData();
      c.width = c.offsetWidth * ratio;
      c.height = c.offsetHeight * ratio;
      c.getContext("2d")?.scale(ratio, ratio);
      pad.current?.clear();
      if (data) pad.current?.fromData(data);
    };
    pad.current = new SignaturePad(c, { penColor: "#1f2524", minWidth: 1, maxWidth: 2.5 });
    pad.current.addEventListener("endStroke", () => setHasSignature(!pad.current?.isEmpty()));
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      pad.current?.off();
    };
  }, []);

  const submit = async () => {
    if (!photo || !pad.current || pad.current.isEmpty()) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("photo", photo);
    fd.set("signature", pad.current.toDataURL("image/png"));
    const res = await fetch(`/api/orders/${orderId}/deliver`, { method: "POST", body: fd });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(j.error ?? "Could not complete delivery");
      return;
    }
    toast.success("Delivered — nice work");
    router.push("/");
    router.refresh();
  };

  return (
    <div className="mt-4 space-y-4">
      <FormError message={error} />
      <Card>
        <CardContent>
          <p className="text-sm font-medium">1. Photo at the door</p>
          <label className="mt-2 flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-ink-300 bg-ink-50">
            {preview ? <img src={preview} alt="Delivery photo" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-1 text-sm text-ink-500"><Camera className="size-7 text-brand-600" /> Tap to take a photo</span>}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0] ?? null; setPhoto(f); setPreview(f ? URL.createObjectURL(f) : null); }} />
          </label>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <div className="flex items-center justify-between"><p className="text-sm font-medium">2. Recipient signature</p><Button size="sm" variant="ghost" onClick={() => { pad.current?.clear(); setHasSignature(false); }}><Eraser /> Clear</Button></div>
          <canvas ref={canvas} className="mt-2 h-44 w-full touch-none rounded-xl border border-ink-300 bg-white" aria-label="Signature pad" />
          <p className="mt-1 text-xs text-ink-500">Ask the recipient to sign with their finger.</p>
        </CardContent>
      </Card>
      <Button size="lg" className="w-full" disabled={!photo || !hasSignature} loading={busy} onClick={submit}><Check /> Mark as delivered</Button>
    </div>
  );
}
