"use client";

import { isOnLocalDay, dateInputValue } from "@getmed/core/format";
import { ConsultationsTable, type ConsultationRow } from "@getmed/ui";
import { useDateWindow } from "@/lib/use-date-window";
import { updateConsultationStatusAction } from "@/lib/actions/consultations";

/** Wires the shared table to this app's routing and status action. */
export function ConsultationsView({ rows, from, to }: { rows: ConsultationRow[]; from: string; to: string }) {
  const { setWindow, refresh, loading } = useDateWindow(from, to);
  return (
    <ConsultationsTable
      rows={rows}
      from={from}
      to={to}
      onWindowChange={setWindow}
      onRefresh={refresh}
      loading={loading}
      isToday={(iso) => isOnLocalDay(iso, dateInputValue(new Date()))}
      onStatusChange={updateConsultationStatusAction}
      openHref={(id) => `/consultations/${id}`}
    />
  );
}
