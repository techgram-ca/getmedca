"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Button, Card, CardContent, Field, FormError, Input, toast } from "@getmed/ui";
import { createDriver, type DriverState } from "@/lib/actions/drivers";

export function DriverForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<DriverState, FormData>(createDriver, null);
  useEffect(() => {
    if (state?.id) {
      toast.success("Driver created");
      router.push(`/drivers/${state.id}`);
    }
  }, [state, router]);
  return (
    <form action={action}>
      <Card><CardContent className="space-y-4">
        <FormError message={state?.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name" required className="sm:col-span-2"><Input id="name" name="name" required /></Field>
          <Field label="Phone" htmlFor="phone" required><Input id="phone" name="phone" type="tel" required /></Field>
          <Field label="Email (login)" htmlFor="email" required><Input id="email" name="email" type="email" required /></Field>
          <Field label="Initial password" htmlFor="password" required hint="At least 10 characters." className="sm:col-span-2"><Input id="password" name="password" type="text" autoComplete="off" required minLength={10} /></Field>
          <Field label="Vehicle make" htmlFor="vehicleMake"><Input id="vehicleMake" name="vehicleMake" placeholder="Toyota" /></Field>
          <Field label="Model" htmlFor="vehicleModel"><Input id="vehicleModel" name="vehicleModel" placeholder="Corolla" /></Field>
          <Field label="Colour" htmlFor="vehicleColor"><Input id="vehicleColor" name="vehicleColor" /></Field>
          <Field label="Plate" htmlFor="vehiclePlate"><Input id="vehiclePlate" name="vehiclePlate" /></Field>
          <Field label="Driver's licence (PDF/image)" htmlFor="licenseDoc"><Input id="licenseDoc" name="licenseDoc" type="file" accept="image/*,.pdf" /></Field>
          <Field label="Insurance (PDF/image)" htmlFor="insuranceDoc"><Input id="insuranceDoc" name="insuranceDoc" type="file" accept="image/*,.pdf" /></Field>
        </div>
        <Button type="submit" loading={pending} size="lg">Create driver</Button>
      </CardContent></Card>
    </form>
  );
}
