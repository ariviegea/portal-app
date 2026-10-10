"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";

/** Asks the server for the portal data again without reloading the page. */
export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button variant="secondary" disabled={isPending} onClick={() => startTransition(() => router.refresh())}>
      {isPending ? "Refreshing…" : "Refresh"}
    </Button>
  );
}
