"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { isOnLocalDay, shortId, timeAgo } from "@getmed/core/format";
import type { OrderStatus } from "@getmed/db/types";
import {
  Badge,
  Button,
  EmptyState,
  FilterSelect,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableFilters,
} from "@getmed/ui";
import { useDateWindow } from "@/lib/use-date-window";

export type EscalationRow = {
  id: string;
  status: OrderStatus;
  escalated_at: string;
  escalation_status: string | null;
  patient_name: string;
  patient_phone: string;
  pharmacyName: string | null;
  reasonKind: string;
  reasonText: string | null;
};

export function EscalationsTable({ rows, from, to }: { rows: EscalationRow[]; from: string; to: string }) {
  const { setWindow, loading } = useDateWindow(from, to);
  const [handling, setHandling] = useState("open");
  const [kind, setKind] = useState("");
  const [search, setSearch] = useState("");
  const [today, setToday] = useState(false);

  const kinds = useMemo(() => [...new Set(rows.map((r) => r.reasonKind))].sort(), [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const day = new Date().toISOString().slice(0, 10);
    return rows.filter((r) => {
      const state = r.escalation_status ?? "open";
      // "open" is the default view: anything not yet resolved still needs someone.
      if (handling === "open" && state === "resolved") return false;
      if (handling !== "open" && handling !== "" && state !== handling) return false;
      if (kind && r.reasonKind !== kind) return false;
      if (today && !isOnLocalDay(r.escalated_at, day)) return false;
      if (!q) return true;
      return (
        r.patient_name.toLowerCase().includes(q) ||
        (digits.length >= 3 && r.patient_phone.replace(/\D/g, "").includes(digits)) ||
        shortId(r.id).toLowerCase().includes(q) ||
        (r.pharmacyName ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, handling, kind, search, today]);

  return (
    <>
      <TableFilters
        from={from}
        to={to}
        onWindowChange={setWindow}
        today={today}
        onTodayChange={setToday}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Patient, phone, pharmacy or order ID"
        onReset={() => {
          setHandling("open");
          setKind("");
          setSearch("");
          setToday(false);
        }}
        loading={loading}
        showing={visible.length}
        total={rows.length}
        noun="escalations"
      >
        <FilterSelect value={handling} onChange={setHandling} label="Handling">
          <option value="open">Open + contacted</option>
          <option value="">All</option>
          <option value="contacted">Contacted</option>
          <option value="resolved">Resolved</option>
        </FilterSelect>
        <FilterSelect value={kind} onChange={setKind} label="Reason">
          <option value="">All reasons</option>
          {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
        </FilterSelect>
      </TableFilters>

      {visible.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle />}
          title={rows.length === 0 ? "No escalations in this period" : "No escalations match these filters"}
        />
      ) : (
        <div className="surface overflow-x-auto">
          <Table>
            <THead><TR><TH>Order</TH><TH>Patient</TH><TH>Pharmacy</TH><TH>Reason</TH><TH>Since</TH><TH>Handling</TH><TH /></TR></THead>
            <TBody>
              {visible.map((r) => (
                <TR key={r.id}>
                  <TD><span className="font-mono font-medium">{shortId(r.id)}</span><div className="mt-0.5"><StatusBadge status={r.status} /></div></TD>
                  <TD><div>{r.patient_name}</div><a href={`tel:${r.patient_phone}`} className="text-xs text-brand-700">{r.patient_phone}</a></TD>
                  <TD>{r.pharmacyName ?? "—"}</TD>
                  <TD className="max-w-xs"><div className="font-medium">{r.reasonKind}</div>{r.reasonText ? <div className="text-xs text-ink-500">{r.reasonText}</div> : null}</TD>
                  <TD className="whitespace-nowrap text-ink-500">{timeAgo(r.escalated_at)}</TD>
                  <TD>
                    <Badge tone={r.escalation_status === "resolved" ? "success" : r.escalation_status === "contacted" ? "info" : "warning"} className="capitalize">
                      {r.escalation_status ?? "open"}
                    </Badge>
                  </TD>
                  <TD className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/orders/${r.id}`}>Handle</Link></Button></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </>
  );
}
