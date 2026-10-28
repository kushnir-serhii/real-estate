import { HONEYPOT_FIELD } from "./lead-form-schema";

/** Trap for bots: hidden from people and screen readers, must stay empty. */
export const HoneypotField = () => (
  <div aria-hidden="true" className="sr-only">
    <label htmlFor={`${HONEYPOT_FIELD}-trap`}>Не заповнюйте це поле</label>
    <input id={`${HONEYPOT_FIELD}-trap`} type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
  </div>
);
