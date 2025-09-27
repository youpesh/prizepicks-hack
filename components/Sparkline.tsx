"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";

type SparklineProps = {
  data: { t: number; v: number; m: number }[];
};

export default function Sparkline({ data }: SparklineProps) {
  return (
    <div className="h-20 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip cursor={false} contentStyle={{ fontSize: 12 }} formatter={(v: number) => v.toFixed(2)} labelFormatter={() => ""} />
          <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="m" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


