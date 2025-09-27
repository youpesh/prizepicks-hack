"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Sparkline from "./Sparkline";

type InsightCardProps = {
  title: string;
  insight?: string;
  confidence?: number; // 0..100
  status?: "normal" | "warning" | "alert";
  series?: { t: number; v: number; m: number }[];
  reasons?: { feature: string; direction: "up" | "down"; magnitude?: number }[];
};

export function InsightCard({ title, insight = "", confidence = 0, status = "normal", series = [], reasons = [] }: InsightCardProps) {
  const statusVariant = status === "alert" ? "destructive" : status === "warning" ? "secondary" : "outline";

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
          <div className="text-xs text-muted-foreground">
            {reasons.slice(0, 2).map((r, i) => (
              <span key={i} className="mr-2">
                {r.feature}:{" "}
                <span className={r.direction === "up" ? "text-green-600" : "text-red-600"}>{r.direction}</span>
                {r.magnitude !== undefined ? ` (${r.magnitude.toFixed(2)})` : ""}
              </span>
            ))}
          </div>
        ) : null}
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


