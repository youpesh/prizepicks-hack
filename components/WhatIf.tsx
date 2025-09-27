"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

type WhatIfProps = {
  projection: number;
};

export default function WhatIf({ projection }: WhatIfProps) {
  const base = projection || 0;
  const [pace, setPace] = (globalThis as any).React?.useState?.(0) || [0, () => {}];
  const [usage, setUsage] = (globalThis as any).React?.useState?.(0) || [0, () => {}];
  const delta = base * (pace / 100) * 0.4 + base * (usage / 100) * 0.6;
  const next = base + delta;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">What‑If</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm"><span>Projection</span><span>{base.toFixed(1)}</span></div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><Label>Pace</Label><span className="text-xs text-muted-foreground">{pace}%</span></div>
          <Slider value={[pace]} min={-30} max={30} step={1} onValueChange={(v) => setPace(v[0])} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><Label>Usage</Label><span className="text-xs text-muted-foreground">{usage}%</span></div>
          <Slider value={[usage]} min={-30} max={30} step={1} onValueChange={(v) => setUsage(v[0])} />
        </div>
        <div className="flex justify-between text-sm"><span>What‑If result</span><span>{next.toFixed(1)} ({delta >= 0 ? "+" : ""}{delta.toFixed(1)})</span></div>
      </CardContent>
    </Card>
  );
}



