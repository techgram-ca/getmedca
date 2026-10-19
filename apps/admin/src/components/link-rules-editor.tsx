"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { isSafeRulePath, joinUrl, type LinkRule } from "@getmed/core/outreach";
import { Alert, Badge, Button, Dialog, DialogContent, Field, Input, Select, Switch, toast } from "@getmed/ui";
import { deleteLinkRule, saveLinkRule } from "@/lib/actions/outreach";

type Rule = LinkRule & { id: string; sort_order: number };
type Draft = { id?: string; slug: string; site: "pharmacy" | "patient"; path: string; appendsRest: boolean; label: string };

const EMPTY: Draft = { slug: "", site: "pharmacy", path: "/", appendsRest: false, label: "" };

/**
 * Where each invite-link suffix sends people.
 *
 * Folded away by default: it is set once and then wanted about twice a year,
 * while the contact list underneath it is the reason anyone opens this page.
 */
export function LinkRulesEditor({
  rules,
  pharmacyUrl,
  patientUrl,
}: {
  rules: Rule[];
  pharmacyUrl: string;
  patientUrl: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const siteUrl = (site: "pharmacy" | "patient") => (site === "patient" ? patientUrl : pharmacyUrl);
  const preview = (d: { site: "pharmacy" | "patient"; path: string }) => joinUrl(siteUrl(d.site), d.path);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      else toast.error(r.error ?? "Failed");
    });

  const save = () =>
    start(async () => {
      if (!draft) return;
      const r = await saveLinkRule(draft);
      if (r.ok) {
        toast.success("Destination saved");
        setDraft(null);
        router.refresh();
      } else toast.error(r.error);
    });

  const pathOk = !draft || isSafeRulePath(draft.path);

  return (
    <div className="surface mb-5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-soft hover:bg-ink-50"
      >
        <span>
          <span className="text-sm font-semibold text-ink-900">Link destinations</span>
          <span className="ml-2 text-xs text-ink-500">{rules.length} set up — where each invite link sends people</span>
        </span>
        <ChevronDown className={`size-4 text-ink-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="border-t border-ink-200 p-5">
          <ul className="list-none space-y-2">
            {rules.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 px-4 py-2.5">
                <code className="shrink-0 rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs text-ink-700">
                  /i/&lt;token&gt;{r.slug ? `/${r.slug}` : ""}
                </code>
                <span className="text-ink-400">→</span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-brand-700">
                  {preview(r)}
                  {r.appends_rest ? <span className="text-ink-400">/…</span> : null}
                </span>
                {r.appends_rest ? <Badge tone="neutral">appends</Badge> : null}
                {r.site === "patient" ? <Badge tone="brand">patient site</Badge> : null}
                <span className="text-xs text-ink-500">{r.label}</span>
                <div className="ml-auto flex shrink-0 items-center">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Edit"
                    onClick={() =>
                      setDraft({ id: r.id, slug: r.slug, site: r.site, path: r.path, appendsRest: r.appends_rest, label: r.label })
                    }
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete"
                    className="text-danger-500"
                    disabled={pending || r.slug === ""}
                    title={r.slug === "" ? "Every invite link uses this one" : "Delete"}
                    onClick={() => run(() => deleteLinkRule(r.id))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <Button size="sm" variant="outline" className="mt-3" onClick={() => setDraft(EMPTY)}>
            <Plus /> New destination
          </Button>
        </div>
      ) : null}

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent title={draft?.id ? "Edit destination" : "New destination"} className="max-w-xl">
          {draft ? (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <Field
                label="Link suffix"
                htmlFor="lr-slug"
                hint="The bit after the token. Leave blank for the bare /i/<token>."
              >
                <Input
                  id="lr-slug"
                  value={draft.slug}
                  placeholder="rates"
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                <Field label="Site" htmlFor="lr-site">
                  <Select id="lr-site" value={draft.site} onChange={(e) => setDraft({ ...draft, site: e.target.value as "pharmacy" | "patient" })}>
                    <option value="pharmacy">Pharmacy site</option>
                    <option value="patient">Patient site</option>
                  </Select>
                </Field>
                <Field
                  label="Path"
                  htmlFor="lr-path"
                  required
                  error={pathOk ? null : "Must start with / and name no host"}
                  hint="Rooted path only. The site above decides the domain."
                >
                  <Input id="lr-path" value={draft.path} invalid={!pathOk} onChange={(e) => setDraft({ ...draft, path: e.target.value })} required />
                </Field>
              </div>

              <label className="flex items-start gap-2.5 text-sm">
                <Switch checked={draft.appendsRest} onCheckedChange={(v) => setDraft({ ...draft, appendsRest: v })} />
                <span>
                  <span className="font-medium text-ink-950">Append whatever follows</span>
                  <span className="block text-xs text-ink-500">
                    So <code>/i/&lt;token&gt;/{draft.slug || "slug"}/bolton</code> goes to <code>{draft.path}/bolton</code>. Off,
                    and anything extra is ignored rather than landing on a page that does not exist.
                  </span>
                </span>
              </label>

              <Field label="Name" htmlFor="lr-label" required hint="What you call it in this list.">
                <Input id="lr-label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} required />
              </Field>

              {pathOk ? (
                <Alert tone="info">
                  <span className="font-mono text-xs">
                    {joinUrl(pharmacyUrl, `i/<token>${draft.slug ? `/${draft.slug}` : ""}`)}
                    {draft.appendsRest ? "/bolton" : ""}
                    {"  →  "}
                    {preview(draft)}
                    {draft.appendsRest ? "/bolton" : ""}
                  </span>
                </Alert>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
                <Button type="submit" loading={pending} disabled={!pathOk}>Save</Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
