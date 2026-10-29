import type { RetryChannel } from "./retry-state";

const SERVICE_NAMES: Record<RetryChannel, string> = { plektan: "Plektan", telegram: "Telegram" };

/**
 * Plain-Ukrainian text for the error code stored on a lead («timeout», «network», «http 500»,
 * «invalid_response», «api», «unexpected»). Unknown codes are shown in brackets.
 */
export const describeDeliveryError = (channel: RetryChannel, error: string | null): string => {
  const service = SERVICE_NAMES[channel];
  const code = (error ?? "").trim();
  if (code === "") return "Невідома помилка";

  const http = /^http (\d{3})$/.exec(code);
  if (http) {
    const status = Number(http[1]);
    if (status === 401 || status === 403) return `${service} відхилив ключ доступу (${status})`;
    if (status === 429) return `${service} тимчасово обмежив кількість запитів (429)`;
    if (status >= 500) return `Помилка на стороні ${service} (${status})`;
    return `${service} відхилив запит (${status})`;
  }

  switch (code) {
    case "timeout":
      return `${service} не відповів вчасно`;
    case "network":
      return `Немає зв'язку з ${service}`;
    case "invalid_response":
      return `${service} повернув незрозумілу відповідь`;
    case "api":
      return `${service} повернув помилку`;
    case "unexpected":
      return "Невідома помилка";
    default:
      return `Не вдалося надіслати до ${service} [${code}]`;
  }
};
