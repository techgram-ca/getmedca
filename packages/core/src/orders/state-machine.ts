import type { OrderStatus } from "@getmed/db/types";

export type Actor = "pharmacy" | "admin" | "driver" | "system";

export type OrderAction =
  | "accept"
  | "reject"
  | "mark_ready"
  | "assign_driver"
  | "pick_up"
  | "deliver"
  | "fail"
  | "cancel"
  | "time_out";

type Transition = { from: readonly OrderStatus[]; to: OrderStatus; actors: readonly Actor[] };

/**
 * Single source of truth for the order state machine (spec §4).
 * Lives in application code; RLS is for access control only.
 */
export const TRANSITIONS: Record<OrderAction, Transition> = {
  accept: { from: ["pending"], to: "accepted", actors: ["pharmacy"] },
  reject: { from: ["pending"], to: "rejected", actors: ["pharmacy"] },
  mark_ready: { from: ["accepted"], to: "ready_for_delivery", actors: ["pharmacy"] },
  assign_driver: { from: ["ready_for_delivery", "assigned"], to: "assigned", actors: ["admin"] },
  pick_up: { from: ["assigned"], to: "picked_up", actors: ["driver"] },
  deliver: { from: ["picked_up"], to: "delivered", actors: ["driver"] },
  fail: { from: ["picked_up"], to: "failed", actors: ["driver"] },
  // Pharmacy may cancel only AFTER accepting and BEFORE pickup.
  cancel: { from: ["accepted", "ready_for_delivery", "assigned"], to: "cancelled", actors: ["pharmacy"] },
  time_out: { from: ["pending"], to: "timed_out", actors: ["system"] },
};

/** Statuses at which the pharmacy has lost all write access (spec §4). */
export const PHARMACY_LOCKED_STATUSES: readonly OrderStatus[] = [
  "picked_up",
  "delivered",
  "failed",
  "rejected",
  "cancelled",
  "timed_out",
];

export const TERMINAL_STATUSES: readonly OrderStatus[] = ["delivered", "failed", "rejected", "cancelled", "timed_out"];

/** Statuses that converge on the admin escalation pattern. */
export const ESCALATION_STATUSES: readonly OrderStatus[] = ["rejected", "cancelled", "timed_out", "failed"];

export function canTransition(action: OrderAction, from: OrderStatus, actor: Actor): boolean {
  const t = TRANSITIONS[action];
  return t.from.includes(from) && t.actors.includes(actor);
}

export function pharmacyCanModify(status: OrderStatus): boolean {
  return !PHARMACY_LOCKED_STATUSES.includes(status);
}

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Actions a given actor may perform from a given status (for UI affordances). */
export function availableActions(status: OrderStatus, actor: Actor): OrderAction[] {
  return (Object.keys(TRANSITIONS) as OrderAction[]).filter((a) => canTransition(a, status, actor));
}
