"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, toast } from "@getmed/ui";
import { saveConsultationTopics } from "@/lib/actions/profile";
import { IssuePricingEditor } from "./issue-pricing-editor";

/**
 * Consultation topics, on the Pharmacists tab.
 *
 * They sit here rather than under business details because a topic is a
 * promise that one of these people will call a patient back, and the two were
 * two tabs apart. Picking topics is also the whole decision now — there is no
 * separate "offers consultations" switch to contradict, so an empty list is
 * how a pharmacy says it does not take consultations.
 *
 * Saved on its own button. The pharmacist list below writes itself one row at
 * a time, so there is no shared Save to hang this off.
 */
export function ConsultationTopicsCard({
  issues,
  selected,
  prices,
  pharmacistCount,
}: {
  issues: { id: string; name: string }[];
  selected: string[];
  prices: Record<string, string>;
  pharmacistCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [issueIds, setIssueIds] = useState(selected);
  const [issuePrices, setIssuePrices] = useState(prices);

  const needsPharmacist = issueIds.length > 0 && pharmacistCount === 0;
  const dirty =
    issueIds.length !== selected.length ||
    issueIds.some((id) => !selected.includes(id)) ||
    issueIds.some((id) => (issuePrices[id] ?? "") !== (prices[id] ?? ""));

  const save = () =>
    start(async () => {
      const r = await saveConsultationTopics({ issueIds, issuePrices });
      if (r.ok) {
        toast.success(issueIds.length ? "Consultation topics saved" : "Consultations switched off");
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consultation topics</CardTitle>
        <CardDescription>
          Patients browse these to find you. Leave a price blank to charge no fee. Select none and consultations stay
          switched off for your pharmacy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <IssuePricingEditor
          issues={issues}
          selected={issueIds}
          prices={issuePrices}
          onSelectedChange={setIssueIds}
          onPricesChange={setIssuePrices}
        />
        {needsPharmacist ? (
          <Alert tone="warning" title="Add a pharmacist first">
            A topic is a promise that someone will call the patient back, so add at least one pharmacist below before
            saving these.
          </Alert>
        ) : null}
        <Button onClick={save} loading={pending} loadingText="Saving…" disabled={!dirty || needsPharmacist}>
          Save topics
        </Button>
      </CardContent>
    </Card>
  );
}
