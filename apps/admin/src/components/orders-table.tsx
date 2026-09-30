"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Check, ClipboardList, Truck, X } from "lucide-react";
import { REMOTE_ZONE, zoneLabel } from "@getmed/core/pricing";
import { formatCurrency, formatDate, isOnLocalDay, shortId } from "@getmed/core/format";
import type { DeliveryZone, OrderStatus } from "@getmed/db/types";
import {
  Badge,
  Button,
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
import { assignDriverAction, setDeliveryZoneAction } from "@/lib/actions/orders";

const STATUSES: OrderStatus[] = [
  "pending", "accepted", "ready_for_delivery", "assigned", "picked_up",
  "delivered", "failed", "rejected", "cancelled", "timed_out",
];

export type AdminOrderRow = {
  id: string;
  created_at: string;
  status: OrderStatus;
  order_type: string;
  source: string;
  patient_name: string;
  patient_phone: string;
  pharmacy_id: string;
  pharmacyName: string | null;
  driverName: string | null;
  assigned_driver_id: string | null;
  delivery_type: DeliveryZone | null;
  delivery_fee_charged: number | null;
  delivery_quote_min: number | null;
  delivery_quote_max: number | null;
};

export type DriverOption = { id: string; name: string };

/** Statuses at which a driver can still be assigned. */
const ASSIGNABLE: OrderStatus[] = ["ready_for_delivery", "assigned"];

export function AdminOrdersTable({
  rows,
  pharmacies,
  drivers,
  from,
  to,
}: {
  rows: AdminOrderRow[];
  pharmacies: { id: string; name: string | null }[];
  drivers: DriverOption[];
  from: string;
  to: string;
}) {
  const { setWindow, refresh, loading } = useDateWindow(from, to);
  const [status, setStatus] = useState("");
  const [pharmacy, setPharmacy] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [today, setToday] = useState(false);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const day = new Date().toISOString();
    return rows.filter((o) => {
      if (status && o.status !== status) return false;
      if (pharmacy && o.pharmacy_id !== pharmacy) return false;
      if (source && o.source !== source) return false;
      if (today && !isOnLocalDay(o.created_at, day.slice(0, 10))) return false;
      if (!q) return true;
      return (
        o.patient_name.toLowerCase().includes(q) ||
        (digits.length >= 3 && o.patient_phone.replace(/\D/g, "").includes(digits)) ||
        shortId(o.id).toLowerCase().includes(q)
      );
    });
  }, [rows, status, pharmacy, source, search, today]);

  const reset = () => {
    setStatus("");
    setPharmacy("");
    setSource("");
    setSearch("");
    setToday(false);
  };

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
        onReset={reset}
        loading={loading}
        showing={visible.length}
        total={rows.length}
        noun="orders"
      >
        <FilterSelect value={status} onChange={setStatus} label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </FilterSelect>
        <FilterSelect value={pharmacy} onChange={setPharmacy} label="Pharmacy">
          <option value="">All pharmacies</option>
          {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </FilterSelect>
        <FilterSelect value={source} onChange={setSource} label="Source">
          <option value="">Online + manual</option>
          <option value="online">Online</option>
          <option value="manual">Manual</option>
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
              <TR><TH>Order</TH><TH>Patient</TH><TH>Pharmacy</TH><TH>Delivery</TH><TH>Driver</TH><TH>Status</TH><TH>Created</TH><TH /></TR>
            </THead>
            <TBody>
              {visible.map((o) => <OrderRow key={o.id} order={o} drivers={drivers} />)}
            </TBody>
          </Table>
        </div>
      )}
    </>
  );
}

/**
 * One order, with the two things an admin does most often available without
 * opening it: settling a Zone 5 price, and putting a driver on the job.
 */
function OrderRow({ order, drivers }: { order: AdminOrderRow; drivers: DriverOption[] }) {
  const [editing, setEditing] = useState(false);
  const [driverId, setDriverId] = useState(order.assigned_driver_id ?? "");
  const [price, setPrice] = useState(
    order.delivery_fee_charged != null ? String(order.delivery_fee_charged) : order.delivery_quote_min != null ? String(order.delivery_quote_min) : "",
  );
  const [pending, start] = useTransition();

  const isRemote = order.delivery_type === REMOTE_ZONE;
  // Zone 5 has no configured price, so it must be settled before a driver goes.
  const needsPrice = isRemote && order.delivery_fee_charged == null;
  const typed = Number(price);
  const priceOk =
    !needsPrice ||
    (price.trim() !== "" &&
      Number.isFinite(typed) &&
      (order.delivery_quote_min == null || typed >= order.delivery_quote_min) &&
      (order.delivery_quote_max == null || typed <= order.delivery_quote_max));
  const canAssign = ASSIGNABLE.includes(order.status) && order.delivery_type != null;

  const save = () =>
    start(async () => {
      // Price first: assigning a driver is refused while Zone 5 is unpriced.
      if (needsPrice) {
        const priced = await setDeliveryZoneAction(order.id, REMOTE_ZONE, typed);
        if (!priced.ok) {
          toast.error(priced.error);
          return;
        }
      }
      if (driverId && driverId !== order.assigned_driver_id) {
        const assigned = await assignDriverAction(order.id, driverId);
        if (!assigned.ok) {
          toast.error(assigned.error);
          return;
        }
      }
      toast.success("Order updated");
      setEditing(false);
    });

  return (
    <TR>
      <TD className="font-mono font-medium">
        {shortId(order.id)}
        <div className="flex items-center gap-1 text-[10px] uppercase text-ink-400">
          {order.order_type}
          {order.source === "manual" ? <Badge tone="accent" className="px-1.5 py-0 text-[9px]">Manual</Badge> : null}
        </div>
      </TD>
      <TD><div>{order.patient_name}</div><div className="text-xs text-ink-500">{order.patient_phone}</div></TD>
      <TD>{order.pharmacyName ?? "—"}</TD>
      <TD className="whitespace-nowrap">
        {order.delivery_type ? (
          <>
            <div className="text-sm">{zoneLabel(order.delivery_type)}</div>
            <div className="text-xs text-ink-500">
              {order.delivery_fee_charged != null ? (
                formatCurrency(order.delivery_fee_charged)
              ) : order.delivery_quote_min != null && order.delivery_quote_max != null ? (
                <span className="text-accent-600">
                  {formatCurrency(order.delivery_quote_min)} – {formatCurrency(order.delivery_quote_max)} · needs a price
                </span>
              ) : (
                "—"
              )}
            </div>
          </>
        ) : (
          <span className="text-ink-400">Not set</span>
        )}
      </TD>
      <TD>
        {editing ? (
          <div className="flex flex-col gap-1.5">
            {needsPrice ? (
              <div className="relative w-28">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-500">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min={order.delivery_quote_min ?? 0}
                  max={order.delivery_quote_max ?? undefined}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  invalid={!priceOk}
                  aria-label="Zone 5 price"
                  className="h-8 pl-5 text-sm"
                />
              </div>
            ) : null}
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              aria-label="Driver"
              className="h-8 w-40 cursor-pointer rounded-full border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-600"
            >
              <option value="">Choose a driver…</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <div className="flex gap-1">
              <Button
                size="icon"
                className="size-7"
                aria-label="Save"
                loading={pending}
                disabled={!priceOk || (!driverId && !needsPrice)}
                onClick={save}
              >
                {pending ? null : <Check className="size-3.5" />}
              </Button>
              <Button size="icon" variant="ghost" className="size-7" aria-label="Cancel" disabled={pending} onClick={() => setEditing(false)}>
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={order.driverName ? "" : "text-ink-400"}>{order.driverName ?? "—"}</span>
            {canAssign ? (
              <Button size="icon" variant="ghost" className="size-7" aria-label="Assign driver" onClick={() => setEditing(true)}>
                <Truck className="size-3.5" />
              </Button>
            ) : null}
          </div>
        )}
      </TD>
      <TD><StatusBadge status={order.status} /></TD>
      <TD className="whitespace-nowrap text-ink-500">{formatDate(order.created_at)}</TD>
      <TD className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/orders/${order.id}`}>View</Link></Button></TD>
    </TR>
  );
}
