"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { parseFsaText, type PostalAreaCityView } from "@getmed/core/pricing";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  EmptyState,
  Field,
  FormError,
  Input,
  Textarea,
  cn,
  toast,
} from "@getmed/ui";
import { deletePostalAreasAction, renameCityAction, savePostalAreasAction } from "@/lib/actions/postal-areas";

export function PostalAreasManager({ cities }: { cities: PostalAreaCityView[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("ON");
  const [fsas, setFsas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null);
  const [removing, setRemoving] = useState<{ fsas: string[]; label: string; taggedBy: number } | null>(null);
  const [pending, start] = useTransition();

  const parsed = useMemo(() => parseFsaText(fsas), [fsas]);
  const known = useMemo(() => new Map(cities.flatMap((c) => c.areas.map((a) => [a.fsa, a.city] as const))), [cities]);
  const moving = useMemo(
    () => parsed.codes.filter((f) => known.has(f) && known.get(f) !== city.trim()),
    [parsed.codes, known, city],
  );

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return cities;
    return cities
      .map((c) => ({ ...c, areas: c.city.toLowerCase().includes(q) ? c.areas : c.areas.filter((a) => a.fsa.toLowerCase().includes(q)) }))
      .filter((c) => c.areas.length > 0);
  }, [cities, filter]);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.ok) {
        toast.success(r.message ?? "Saved");
        after?.();
        router.refresh();
      } else {
        setError(r.error ?? "Something went wrong");
        toast.error(r.error ?? "Something went wrong");
      }
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add postal areas</CardTitle>
          <CardDescription>
            Paste or type the postal areas for a city, separated however you like. A postal area already listed under
            another city is moved here — pharmacy zone tags follow it, because the zone is keyed on the postal area and
            the city is only a label.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () => savePostalAreasAction({ city, province, fsas }),
                () => {
                  setCity("");
                  setFsas("");
                },
              );
            }}
          >
            <FormError message={error} title="Postal areas not saved" />
            <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
              <Field label="City" htmlFor="new-city">
                <Input id="new-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Oshawa" maxLength={80} />
              </Field>
              <Field label="Province" htmlFor="new-province">
                <Input id="new-province" value={province} onChange={(e) => setProvince(e.target.value.toUpperCase())} maxLength={2} />
              </Field>
            </div>
            <Field
              label="Postal areas"
              htmlFor="new-fsas"
              hint={
                <span className="flex flex-wrap items-center gap-x-2">
                  <span className={cn(parsed.codes.length ? "font-semibold text-ink-700" : "")}>{parsed.codes.length} recognised</span>
                  {parsed.malformed.length ? (
                    <span className="inline-flex items-center gap-1 text-danger-500">
                      <AlertTriangle className="size-3" /> {parsed.malformed.join(", ")} is not a postal area
                    </span>
                  ) : null}
                  {moving.length ? <span className="text-ink-500">· {moving.length} will move from another city</span> : null}
                </span>
              }
            >
              <Textarea
                id="new-fsas"
                rows={3}
                spellCheck={false}
                className="font-mono text-sm"
                placeholder="L1G, L1H, L1J, L1K, L1L"
                value={fsas}
                onChange={(e) => setFsas(e.target.value)}
              />
            </Field>
            <Button type="submit" loading={pending} loadingText="Saving…" disabled={!city.trim() || parsed.codes.length === 0 || parsed.malformed.length > 0}>
              <Plus /> Add postal areas
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>On file</CardTitle>
            <CardDescription>Grouped by city. A postal area in use shows how many pharmacies price against it.</CardDescription>
          </div>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Find a city or postal area"
            className="max-w-xs"
            aria-label="Filter"
          />
        </CardHeader>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <EmptyState
              icon={<MapPin />}
              title={cities.length === 0 ? "No postal areas yet" : `Nothing matches “${filter}”`}
              description={cities.length === 0 ? "Add a city above to start pricing deliveries by zone." : undefined}
              className="m-5"
            />
          ) : (
            <div className="divide-y divide-ink-200">
              {visible.map((c) => {
                const inUse = c.areas.reduce((n, a) => n + a.taggedBy, 0);
                return (
                  <div key={c.city} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-brand-600" />
                        <span className="font-semibold text-ink-950">{c.city}</span>
                        <span className="text-xs text-ink-400">
                          {c.province} · {c.areas.length} postal {c.areas.length === 1 ? "area" : "areas"}
                        </span>
                        {inUse ? <Badge tone="brand">In use</Badge> : null}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setRenaming({ from: c.city, to: c.city })}>
                          <Pencil /> Rename
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger-500"
                          onClick={() => setRemoving({ fsas: c.areas.map((a) => a.fsa), label: c.city, taggedBy: inUse })}
                        >
                          <Trash2 /> Remove all
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.areas.map((a) => (
                        <span
                          key={a.fsa}
                          className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white py-1 pl-2 pr-1 font-mono text-xs"
                        >
                          {a.fsa}
                          {a.taggedBy ? <span className="font-sans text-[0.65rem] text-brand-700">{a.taggedBy}</span> : null}
                          <button
                            type="button"
                            aria-label={`Remove ${a.fsa}`}
                            onClick={() => setRemoving({ fsas: [a.fsa], label: a.fsa, taggedBy: a.taggedBy })}
                            className="rounded p-0.5 text-ink-400 transition-soft hover:bg-red-50 hover:text-danger-500"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={renaming !== null} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent title="Rename city" description="Only the label changes. Pricing matches on the postal area, so nothing is repriced.">
          {renaming ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => renameCityAction(renaming.from, renaming.to), () => setRenaming(null));
              }}
            >
              <Field label="City" htmlFor="rename-city">
                <Input id="rename-city" value={renaming.to} onChange={(e) => setRenaming({ ...renaming, to: e.target.value })} autoFocus maxLength={80} />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button>
                <Button type="submit" loading={pending} loadingText="Renaming…" disabled={!renaming.to.trim() || renaming.to === renaming.from}>
                  Rename
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent title={`Remove ${removing?.label ?? ""}?`}>
          {removing ? (
            <div className="space-y-4">
              {removing.taggedBy > 0 ? (
                <Alert tone="danger" title="This is in use">
                  {removing.taggedBy} pharmacy zone {removing.taggedBy === 1 ? "tag uses" : "tags use"} it. Removing it
                  untags it everywhere, and deliveries there fall to Zone 5 until it is added back and re-tagged.
                </Alert>
              ) : (
                <p className="text-sm text-ink-600">
                  No pharmacy prices against {removing.fsas.length === 1 ? "it" : "these"}, so nothing is repriced.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button>
                <Button
                  variant="danger"
                  loading={pending}
                  loadingText="Removing…"
                  onClick={() => run(() => deletePostalAreasAction(removing.fsas), () => setRemoving(null))}
                >
                  <Trash2 /> Remove {removing.fsas.length > 1 ? `${removing.fsas.length} postal areas` : ""}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
