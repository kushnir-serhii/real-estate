/** Keeps only digits and a leading plus, so the value is valid in `tel:`. */
export const toTel = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  return phone.trim().startsWith("+") ? `+${digits}` : digits;
};
