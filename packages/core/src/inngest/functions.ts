import { timeOutOrder } from "../orders/service";
import { inngest, orderCreated, orderResponded } from "./client";

/**
 * 30-minute pharmacy SLA. Waits durably for a pharmacy response event, then
 * times the order out if none arrived. Runs on Inngest, not inside a Vercel
 * function, so the timer survives cold starts and deploys.
 */
export const orderSlaTimer = inngest.createFunction(
  {
    id: "order-sla-timer",
    name: "Pharmacy 30-minute SLA",
    idempotency: "event.data.orderId",
    triggers: [orderCreated],
  },
  async ({ event, step }) => {
    const responded = await step.waitForEvent("wait-for-pharmacy-response", {
      event: orderResponded,
      timeout: `${event.data.slaMinutes}m`,
      if: "event.data.orderId == async.data.orderId",
    });
    if (responded) return { outcome: "responded" as const };
    const order = await step.run("time-out-order", async () => {
      const o = await timeOutOrder(event.data.orderId);
      return { status: o.status };
    });
    return { outcome: order.status };
  },
);

export const functions = [orderSlaTimer];
