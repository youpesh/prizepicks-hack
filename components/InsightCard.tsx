"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Sparkline from "./Sparkline";
import { Button } from "@/components/ui/button";
import { explainLLM } from "@/lib/llm";
import { usePicksStore } from "@/lib/picks";

type InsightCardProps = {
  title: string;
  insight?: string;
  confidence?: number; // 0..100
  status?: "normal" | "warning" | "alert";
  series?: { t: number; v: number; m: number }[];
  reasons?: { feature: string; direction: "up" | "down"; magnitude?: number }[];
  risk?: number;
};

export function InsightCard({ title, insight = "", confidence = 0, status = "normal", series = [], reasons = [], risk = 0 }: InsightCardProps) {
  const statusVariant = status === "alert" ? "destructive" : status === "warning" ? "secondary" : "outline";
  const addPick = usePicksStore((s) => s.addPick);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-medium truncate">{title}</CardTitle>
        <Badge variant={statusVariant}>{status}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground min-h-10">{insight || "Awaiting signal…"}</p>
        {series.length > 0 ? <Sparkline data={series} /> : null}
        {reasons.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {reasons.slice(0, 2).map((r, i) => (
              <span key={i} className={`px-2 py-0.5 rounded-full text-xs ${r.direction === "up" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {r.feature} {r.direction}
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => {
            // derive a simple line near confidence-projection space
            const hash = Array.from(title).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
            const offset = ((hash % 9) - 4) * 0.5;
            const line = Math.round((26.5 + offset) * 2) / 2;
            addPick({ id: `${title}-${Date.now()}`, playerId: title, side: "Over", line, addedAt: Date.now() });
          }}>Add</Button>
          <Button size="sm" variant="outline" onClick={async () => {
            try {
              const r = await explainLLM(title, {} as any);
              alert(r.insight ?? "");
            } catch {}
          }}>Explain</Button>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Early‑warning</span>
            <span>{Math.round(risk)}%</span>
          </div>
          <Progress value={risk} />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Confidence</span>
            <span>{Math.round(confidence)}%</span>
          </div>
          <Progress value={confidence} />
        </div>
      </CardContent>
    </Card>
  );
}

export default InsightCard;


