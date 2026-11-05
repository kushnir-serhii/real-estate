import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signInDemo } from "./auth-actions";

type DemoSignInProps = { next: string };

/** Demo driver: one button, no password. A plain form posting to a server action, so it works without JS. */
export const DemoSignIn = ({ next }: DemoSignInProps) => (
  <form action={signInDemo} className="flex flex-col gap-4">
    <input type="hidden" name="next" value={next} />
    <Button type="submit" size="lg" className="w-full">
      <LogIn aria-hidden="true" />
      Увійти як демо-адміністратор
    </Button>
  </form>
);
