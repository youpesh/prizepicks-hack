"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import { useStreamInsights } from "@/lib/useStreamInsights";

export default function MomentumHeatmap() {
  const stream = useStreamInsights();
  // Map recent alerts to a simple bar where color encodes status
  const buckets = useMemo(() => {
    const now = Date.now();
    const windowMs = 60 * 1000; // last 60s
    const slots = new Array(30).fill(0).map((_, i) => ({ i, s: 0 }));
    stream.recentAlerts.forEach((a) => {
      const dt = now - a.ts;
      if (dt > windowMs) return;
      const slot = Math.floor((1 - dt / windowMs) * (slots.length - 1));
      slots[Math.max(0, Math.min(slots.length - 1, slot))].s += 1;
    });
    return slots;
  }, [stream.recentAlerts]);

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Timeline · Momentum</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-24">
          {buckets.map((b) => {
            const h = Math.min(100, b.s * 20);
            const color = b.s >= 3 ? "bg-red-500" : b.s === 2 ? "bg-yellow-500" : b.s === 1 ? "bg-emerald-500" : "bg-muted";
            return <div key={b.i} className={`w-2 ${color}`} style={{ height: `${h}%` }} />;
          })}
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">green = surge, yellow = pivot, red = cold stretch</div>
      </CardContent>
    </Card>
  );
}


