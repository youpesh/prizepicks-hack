"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePicksStore } from "@/lib/picks";
import { useEffect, useState } from "react";

export default function SlipBuilder() {
  const { picks, clear } = usePicksStore();
  const [countdown, setCountdown] = useState(60);
  useEffect(() => {
    setCountdown(60);
    const t = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [picks.length]);
  const text = picks.map((p) => `${p.side} ${p.line} — ${p.playerId}`).join(" | ");
  return (
    <Card>
      <CardHeader className="flex items-center justify-between flex-row">
        <CardTitle className="text-base">Slip Builder</CardTitle>
        <div className="text-xs text-muted-foreground">refresh in {countdown}s</div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm break-words min-h-10">{text || "No picks yet. Add from Top Picks."}</div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => navigator.clipboard.writeText(text || "")} disabled={!text}>Copy</Button>
          <Button size="sm" variant="outline" onClick={clear} disabled={picks.length === 0}>Clear</Button>
        </div>
      </CardContent>
    </Card>
  );
}


