"use client";

import { Loader2, LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { signOut } from "./auth-actions";

type SignOutButtonProps = { className?: string };

const SubmitButton = ({ className }: SignOutButtonProps) => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending} className={className}>
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <LogOut aria-hidden="true" />}
      {pending ? "Виходимо…" : "Вийти"}
    </Button>
  );
};

export const SignOutButton = ({ className }: SignOutButtonProps) => (
  <form action={signOut}>
    <SubmitButton className={className} />
  </form>
);
