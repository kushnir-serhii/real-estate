/** `email` is echoed back so the form keeps it after a failed attempt (the password is never returned). */
export type SignInState =
  | { status: "idle" }
  | { status: "invalid"; email: string; fieldErrors: { email?: string; password?: string } }
  | { status: "error"; email: string; message: string };

export const INITIAL_SIGN_IN_STATE: SignInState = { status: "idle" };
