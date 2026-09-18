"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Dialog, DialogContent, Field, Textarea, toast } from "@getmed/ui";
import { setPharmacyStatus } from "@/lib/actions/pharmacies";

export function PharmacyStatusActions({ pharmacyId, status }: { pharmacyId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<"inactive" | "rejected" | null>(null);
  const [reason, setReason] = useState("");
  const run = (s: "approved" | "inactive" | "rejected") => start(async () => { const r = await setPharmacyStatus(pharmacyId, s, reason); if (r.ok) { toast.success("Updated"); setDialog(null); router.refresh(); } else toast.error(r.error); });
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "approved" ? <Button loading={pending} onClick={() => run("approved")}>Approve</Button> : null}
      {status === "pending" ? <Button variant="outline" onClick={() => setDialog("rejected")}>Reject</Button> : null}
      {status === "approved" ? <Button variant="outline" onClick={() => setDialog("inactive")}>Set inactive</Button> : null}
      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent title={dialog === "inactive" ? "Set pharmacy inactive" : "Reject application"} description="The pharmacy will be emailed this reason.">
          <Field label="Reason" htmlFor="reason" required><Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDialog(null)}>Back</Button><Button variant="danger" loading={pending} disabled={reason.trim().length < 3} onClick={() => run(dialog!)}>Confirm</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
