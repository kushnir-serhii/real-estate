"use client";

import { LeadForm } from "./lead-form";

type PropertyRequestFormProps = {
  propertyId: string;
  /** Number shown to the visitor (e.g. the Plektan number), when there is one. */
  propertyNumber?: string;
  className?: string;
};

/** «Залишити заявку» about one live property. */
export const PropertyRequestForm = ({ propertyId, propertyNumber, className }: PropertyRequestFormProps) => (
  <LeadForm
    kind="property_request"
    hiddenFields={{ property_id: propertyId }}
    title="Залишити заявку"
    description={
      propertyNumber
        ? `Цікавить об'єкт №${propertyNumber}? Залиште телефон — агент передзвонить і відповість на питання.`
        : "Залиште телефон — агент передзвонить, відповість на питання й домовиться про перегляд."
    }
    messagePlaceholder="Хочу переглянути квартиру. Зручно ввечері після 18:00"
    className={className}
  />
);
