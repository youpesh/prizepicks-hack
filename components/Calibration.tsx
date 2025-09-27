"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type CalibrationProps = {
  total: number;
  hits: number;
};

export default function Calibration({ total, hits }: CalibrationProps) {
  const pct = total > 0 ? Math.round((hits / Math.max(total, 1)) * 100) : 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Calibration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-2">Expected vs realized (last events)</div>
        <Progress value={pct} />
        <div className="mt-2 text-xs text-muted-foreground">{hits}/{total} within ±5 of projection</div>
      </CardContent>
    </Card>
  );
}



