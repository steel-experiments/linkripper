// ABOUTME: While any capture is still in flight, periodically refreshes the
// ABOUTME: route so pending pages flip to "done" without a manual reload.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(interval);
  }, [active, router]);

  return null;
}
