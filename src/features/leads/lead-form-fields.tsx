"use client";

import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "./field-error";
import { LEAD_LIMITS } from "./lead-form-schema";
import type { LeadField } from "./lead-state";
import { formatPhoneInput } from "./phone";

type LeadFormFieldsProps = {
  errors: Partial<Record<LeadField, string>>;
  messagePlaceholder: string;
};

const OPTIONAL = <span className="font-normal text-muted-foreground">(необов&apos;язково)</span>;

/** Name, phone (masked), optional email and message. Uncontrolled except the phone mask; never reset by the form. */
export const LeadFormFields = ({ errors, messagePlaceholder }: LeadFormFieldsProps) => {
  const id = useId();
  const [phone, setPhone] = useState("");
  const ids = {
    name: `${id}-name`,
    phone: `${id}-phone`,
    email: `${id}-email`,
    message: `${id}-message`,
  };
  const errorProps = (field: "name" | "phone" | "email" | "message") =>
    errors[field]
      ? { "aria-invalid": true, "aria-describedby": `${ids[field]}-error` }
      : { "aria-invalid": undefined, "aria-describedby": undefined };

  return (
    <>
      <div className="grid gap-4 @md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor={ids.name}>Ім&apos;я</Label>
          <Input
            id={ids.name}
            name="name"
            autoComplete="name"
            maxLength={LEAD_LIMITS.name}
            {...errorProps("name")}
          />
          <FieldError id={`${ids.name}-error`} message={errors.name} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor={ids.phone}>Телефон</Label>
          <Input
            id={ids.phone}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+380 XX XXX XX XX"
            value={phone}
            onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
            className="tabular-nums"
            {...errorProps("phone")}
          />
          <FieldError id={`${ids.phone}-error`} message={errors.phone} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={ids.email}>Email {OPTIONAL}</Label>
        <Input
          id={ids.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={LEAD_LIMITS.email}
          {...errorProps("email")}
        />
        <FieldError id={`${ids.email}-error`} message={errors.email} />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={ids.message}>Повідомлення {OPTIONAL}</Label>
        <Textarea
          id={ids.message}
          name="message"
          rows={3}
          maxLength={LEAD_LIMITS.message}
          placeholder={messagePlaceholder}
          className="min-h-24"
          {...errorProps("message")}
        />
        <FieldError id={`${ids.message}-error`} message={errors.message} />
      </div>
    </>
  );
};
