"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, MessageSquare, Pencil, X } from "lucide-react";
import { Badge, StatusBadge } from "./badge";
import { Button } from "./button";
import { EmptyState, TBody, TD, TH, THead, TR, Table } from "./misc";
import { FilterSelect, TableFilters } from "./table-filters";
import { toast } from "./toaster";

export type ConsultationRow = {
  id: string;
  created_at: string;
  status: string;
  patient_name: string;
  patient_phone: string;
  topic: string | null;
  callbackWindow: string | null;
  /** Shown only in the admin portal, which spans every pharmacy. */
  pharmacyName?: string | null;
};

const STATUSES = ["new", "contacted", "resolved"] as const;

/**
 * Consultation requests for either portal. The pharmacy and admin lists differ
 * only by a column and who may change a status, so they share this.
 *
 * Filters run in the browser against the loaded window; only the dates refetch.
 */
export function ConsultationsTable({
  rows,
  from,
  to,
  onWindowChange,
  onRefresh,
  loading,
  isToday,
  showPharmacy,
  onStatusChange,
  openHref,
}: {
  rows: ConsultationRow[];
  from: string;
  to: string;
  onWindowChange: (from: string, to: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
  /** Supplied by the app so date handling stays in one place. */
  isToday: (iso: string) => boolean;
  showPharmacy?: boolean;
  /** Omit to make the list read-only. */
  onStatusChange?: (id: string, status: string) => Promise<{ ok: boolean; error?: string }>;
  openHref: (id: string) => string;
}) {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [today, setToday] = useState(false);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (today && !isToday(r.created_at)) return false;
      if (!q) return true;
      return (
        r.patient_name.toLowerCase().includes(q) ||
        (digits.length >= 3 && r.patient_phone.replace(/\D/g, "").includes(digits)) ||
        (r.topic ?? "").toLowerCase().includes(q) ||
        (r.pharmacyName ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, status, search, today, isToday]);

  return (
    <>
      <TableFilters
        from={from}
        to={to}
        onWindowChange={onWindowChange}
        onRefresh={onRefresh}
        today={today}
        onTodayChange={setToday}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Patient, phone or topic"
        onReset={() => {
          setStatus("");
          setSearch("");
          setToday(false);
        }}
        loading={loading}
        showing={visible.length}
        total={rows.length}
        noun="requests"
      >
        <FilterSelect value={status} onChange={setStatus} label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </FilterSelect>
      </TableFilters>

      {visible.length === 0 ? (
        <EmptyState
          icon={<MessageSquare />}
          title={rows.length === 0 ? "No requests in this period" : "No requests match these filters"}
          description={rows.length === 0 ? "Change the dates to load another period." : undefined}
        />
      ) : (
        <div className="surface overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Patient</TH>
                {showPharmacy ? <TH>Pharmacy</TH> : null}
                <TH>Topic</TH>
                <TH>Callback</TH>
                <TH>Status</TH>
                <TH>Received</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {visible.map((r) => (
                <ConsultationRowView
                  key={r.id}
                  row={r}
                  showPharmacy={showPharmacy}
                  onStatusChange={onStatusChange}
                  openHref={openHref}
                />
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </>
  );
}

function ConsultationRowView({
  row,
  showPharmacy,
  onStatusChange,
  openHref,
}: {
  row: ConsultationRow;
  showPharmacy?: boolean;
  onStatusChange?: (id: string, status: string) => Promise<{ ok: boolean; error?: string }>;
  openHref: (id: string) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [next, setNext] = useState(row.status);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      if (!onStatusChange) return;
      const r = await onStatusChange(row.id, next);
      if (r.ok) {
        toast.success("Status updated");
        setEditing(false);
      } else toast.error(r.error ?? "Could not update");
    });

  return (
    <TR>
      <TD><div>{row.patient_name}</div><div className="text-xs text-ink-500">{row.patient_phone}</div></TD>
      {showPharmacy ? <TD>{row.pharmacyName ?? "—"}</TD> : null}
      <TD>{row.topic ?? "—"}</TD>
      <TD className="capitalize">{row.callbackWindow ? <Badge>{row.callbackWindow}</Badge> : "Any"}</TD>
      <TD>
        {editing ? (
          <div className="flex items-center gap-1">
            <select
              value={next}
              onChange={(e) => setNext(e.target.value)}
              aria-label="Status"
              className="h-8 cursor-pointer rounded-full border border-ink-200 bg-white px-2.5 text-sm outline-none focus:border-brand-600"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Button size="icon" className="size-7" aria-label="Save" loading={pending} disabled={next === row.status} onClick={save}>
              {pending ? null : <Check className="size-3.5" />}
            </Button>
            <Button size="icon" variant="ghost" className="size-7" aria-label="Cancel" disabled={pending} onClick={() => { setNext(row.status); setEditing(false); }}>
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <StatusBadge status={row.status} />
            {onStatusChange ? (
              <Button size="icon" variant="ghost" className="size-7" aria-label="Change status" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" />
              </Button>
            ) : null}
          </div>
        )}
      </TD>
      <TD className="whitespace-nowrap text-ink-500">{new Date(row.created_at).toLocaleString()}</TD>
      <TD className="text-right"><Button asChild size="sm" variant="outline"><a href={openHref(row.id)}>Open</a></Button></TD>
    </TR>
  );
}
