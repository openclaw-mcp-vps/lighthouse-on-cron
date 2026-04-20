"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    await fetch("/api/access/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <Button variant="ghost" size="sm" onClick={logout} disabled={busy}>
      {busy ? "Signing out..." : "Sign out"}
    </Button>
  );
}
