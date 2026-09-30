"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Check, ClipboardList, Pencil, X } from "lucide-react";
import { availableActions, type OrderAction } from "@getmed/core/orders/state-machine";
import { zoneShortLabel } from "@getmed/core/pricing";
import { dateInputValue, formatCurrency, formatDate, isOnLocalDay, shortId, statusLabel } from "@getmed/core/format";
import type { OrderStatus } from "@getmed/db/types";
import {
  Badge,
  Button,
  DeliveryPrice,
  EmptyState,
  FilterSelect,
  Input,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableFilters,
  toast,
} from "@getmed/ui";
import { useDateWindow } from "@/lib/use-date-window";
import { acceptOrderAction, cancelOrderAction, markReadyAction, rejectOrderAction, returnToDeliveryAction } from "@/lib/actions/orders";

const STATUSES: OrderStatus[] = [
  "pending", "accepted", "ready_for_delivery", "assigned", "picked_up",
  "delivered", "failed", "rejected", "cancelled", "timed_out",
];

/** What each action is called in the row, and whether it needs a reason first. */
const ACTIONS: Partial<Record<OrderAction, { label: string; reason?: "reject" | "cancel" }>> = {
  accept: { label: "Accept" },
  reject: { label: "Reject", reason: "reject" },
  mark_ready: { label: "Ready for delivery" },
  cancel: { label: "Cancel", reason: "cancel" },
  return_to_delivery: { label: "Send out again" },
};

export type PharmacyOrderRow = {
  id: string;
  created_at: string;
  received_at: string;
  status: OrderStatus;
  order_type: string;
  source: string;
  patient_name: string;
  patient_phone: string;
  delivery_type: string | null;
  delivery_fee_charged: number | null;
  delivery_quote_min: number | null;
  delivery_quote_max: number | null;
};

export function PharmacyOrdersTable({ rows, from, to }: { rows: PharmacyOrderRow[]; from: string; to: string }) {
  const { setWindow, refresh, loading } = useDateWindow(from, to);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [today, setToday] = useState(false);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const day = dateInputValue(new Date());
    return rows.filter((o) => {
      if (status && o.status !== status) return false;
      if (type && o.order_type !== type) return false;
      if (source && o.source !== source) return false;
      if (today && !isOnLocalDay(o.received_at, day)) return false;
      if (!q) return true;
      return (
        o.patient_name.toLowerCase().includes(q) ||
        (digits.length >= 3 && o.patient_phone.replace(/\D/g, "").includes(digits)) ||
        shortId(o.id).toLowerCase().includes(q)
      );
    });
  }, [rows, status, type, source, search, today]);

  return (
    <>
      <TableFilters
        from={from}
        to={to}
        onWindowChange={setWindow}
        onRefresh={refresh}
        today={today}
        onTodayChange={setToday}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Patient, phone or order ID"
        onReset={() => {
          setStatus("");
          setType("");
          setSource("");
          setSearch("");
          setToday(false);
        }}
        loading={loading}
        showing={visible.length}
        total={rows.length}
        noun="orders"
      >
        <FilterSelect value={status} onChange={setStatus} label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </FilterSelect>
        <FilterSelect value={type} onChange={setType} label="Order type">
          <option value="">All types</option>
          <option value="new">New prescription</option>
          <option value="transfer">Transfer</option>
        </FilterSelect>
        <FilterSelect value={source} onChange={setSource} label="Source">
          <option value="">Online + manual</option>
          <option value="online">Online (patient)</option>
          <option value="manual">Manual (entered here)</option>
        </FilterSelect>
      </TableFilters>

      {visible.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title={rows.length === 0 ? "No orders in this period" : "No orders match these filters"}
          description={rows.length === 0 ? "Change the dates to load another period." : undefined}
        />
      ) : (
        <div className="surface overflow-x-auto">
          <Table>
            <THead>
              <TR><TH>Order</TH><TH>Patient</TH><TH>Type</TH><TH>Source</TH><TH>Status</TH><TH>Delivery cost</TH><TH>Received</TH><TH /></TR>
            </THead>
            <TBody>{visible.map((o) => <OrderRow key={o.id} order={o} />)}</TBody>
          </Table>
        </div>
      )}
    </>
  );
}

/** One order, with its next status change available without opening it. */
function OrderRow({ order }: { order: PharmacyOrderRow }) {
  const [editing, setEditing] = useState(false);
  const [action, setAction] = useState<OrderAction | "">("");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  // The state machine decides what is offered, so the row can never propose a
  // move the server would refuse.
  const options = availableActions(order.status, "pharmacy").filter((a) => a in ACTIONS);
  const needsReason = action ? ACTIONS[action]?.reason : undefined;
  const ready = action !== "" && (!needsReason || reason.trim().length > 0);

  const close = () => {
    setEditing(false);
    setAction("");
    setReason("");
  };

  const save = () =>
    start(async () => {
      const text = reason.trim();
      const run = async () => {
        switch (action) {
          case "accept": return acceptOrderAction(order.id);
          case "reject": return rejectOrderAction(order.id, text);
          case "mark_ready": return markReadyAction(order.id);
          case "cancel": return cancelOrderAction(order.id, text);
          case "return_to_delivery": return returnToDeliveryAction(order.id, "");
          default: return { ok: false as const, error: "Choose an action" };
        }
      };
      const r = await run();
      if (r.ok) {
        toast.success("Order updated");
        close();
      } else toast.error(r.error);
    });

  return (
    <TR>
      <TD className="font-mono font-medium">{shortId(order.id)}</TD>
      <TD><div>{order.patient_name}</div><div className="text-xs text-ink-500">{order.patient_phone}</div></TD>
      <TD className="capitalize">{order.order_type}</TD>
      <TD><Badge tone={order.source === "manual" ? "accent" : "neutral"} className="capitalize">{order.source}</Badge></TD>
      <TD>
        {editing ? (
          <div className="flex flex-col gap-1.5">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as OrderAction)}
              aria-label="Next status"
              className="h-8 w-44 cursor-pointer rounded-full border border-ink-200 bg-white px-2.5 text-sm outline-none focus:border-brand-600"
            >
              <option value="">Choose an action…</option>
              {options.map((a) => <option key={a} value={a}>{ACTIONS[a]!.label}</option>)}
            </select>
            {needsReason ? (
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={needsReason === "reject" ? "Why are you rejecting it?" : "Why are you cancelling?"}
                aria-label="Reason"
                maxLength={300}
                className="h-8 w-56 text-sm"
              />
            ) : null}
            <div className="flex gap-1">
              <Button size="icon" className="size-7" aria-label="Save" loading={pending} disabled={!ready} onClick={save}>
                {pending ? null : <Check className="size-3.5" />}
              </Button>
              <Button size="icon" variant="ghost" className="size-7" aria-label="Cancel" disabled={pending} onClick={close}>
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            {options.length ? (
              <Button size="icon" variant="ghost" className="size-7" aria-label="Change status" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" />
              </Button>
            ) : null}
          </div>
        )}
      </TD>
      <TD>
        <DeliveryPrice
          price={{
            zoneLabel: order.delivery_type ? zoneShortLabel(order.delivery_type as never) : null,
            fee: order.delivery_fee_charged != null ? formatCurrency(order.delivery_fee_charged) : null,
            quote:
              order.delivery_quote_min != null && order.delivery_quote_max != null
                ? { min: formatCurrency(order.delivery_quote_min), max: formatCurrency(order.delivery_quote_max) }
                : null,
          }}
          className="text-sm"
        />
      </TD>
      <TD className="whitespace-nowrap text-ink-500">{formatDate(order.received_at)}</TD>
      <TD className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/orders/${order.id}`}>View</Link></Button></TD>
    </TR>
  );
}
