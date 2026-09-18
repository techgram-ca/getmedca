"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { Button, cn } from "@getmed/ui";

type Props = {
  kind: "logo" | "cover" | "gallery" | "pharmacist" | "license";
  label: string;
  value: { path: string | null; url: string | null };
  onChange: (v: { path: string | null; url: string | null }) => void;
  accept?: string;
  aspect?: "square" | "wide" | "doc";
  hint?: string;
};

/** Uploads through /api/uploads (service-role, private bucket) and returns the object path + signed preview URL. */
export function UploadField({ kind, label, value, onChange, accept = "image/*", aspect = "square", hint }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    const j = (await res.json().catch(() => ({}))) as { path?: string; url?: string; error?: string };
    setBusy(false);
    if (!res.ok || !j.path) {
      setError(j.error ?? "Upload failed");
      return;
    }
    onChange({ path: j.path, url: j.url ?? null });
  }

  const isImage = accept.startsWith("image");
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-ink-800">{label}</p>
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-ink-300 bg-ink-50 text-ink-500 transition-soft hover:border-brand-400",
          aspect === "square" && "size-28",
          aspect === "wide" && "h-32 w-full",
          aspect === "doc" && "h-20 w-full",
        )}
      >
        {value.url && isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.url} alt="" className="h-full w-full object-cover" />
        ) : value.path ? (
          <span className="px-3 text-center text-xs">Document uploaded</span>
        ) : busy ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="flex flex-col items-center gap-1 text-xs focus-ring rounded-md p-2"><ImageUp className="size-5" /> Upload</button>
        )}
        {busy && value.path ? <div className="absolute inset-0 flex items-center justify-center bg-white/70"><Loader2 className="size-5 animate-spin" /></div> : null}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => input.current?.click()} disabled={busy}>{value.path ? "Replace" : "Choose file"}</Button>
        {value.path ? <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ path: null, url: null })}><Trash2 /> Remove</Button> : null}
      </div>
      <input ref={input} type="file" accept={accept} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
      {error ? <p className="text-xs text-danger-500">{error}</p> : hint ? <p className="text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}
