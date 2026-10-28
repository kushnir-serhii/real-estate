"use client";

import { DealField } from "./deal-field";
import { LeadForm } from "./lead-form";
import type { LeadDeal } from "./lead-form-schema";
import { PropertyTypeField } from "./property-type-field";

type GeneralRequestFormProps = {
  title?: string;
  description?: string;
  /** Id of the sold property the visitor wants something similar to (sold page). */
  similarTo?: string;
  defaultDeal?: LeadDeal;
  className?: string;
};

/** Buy / rent wishes without a specific property: `/contacts`, the home CTA, the sold page. */
export const GeneralRequestForm = ({ title, description, similarTo, defaultDeal, className }: GeneralRequestFormProps) => (
  <LeadForm
    kind="general"
    hiddenFields={{ similar_to: similarTo }}
    title={title}
    description={description}
    messagePlaceholder="Наприклад: 2 кімнати біля метро, до 80 000 $"
    renderExtraFields={(errors) => (
      <div className="grid gap-4 @md:grid-cols-2 @md:items-start">
        <DealField defaultDeal={defaultDeal} error={errors.deal} />
        <PropertyTypeField error={errors.property_type} />
      </div>
    )}
    className={className}
  />
);
