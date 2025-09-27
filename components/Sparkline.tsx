"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";

type SparklineProps = {
  data: { t: number; v: number; m: number }[];
};

export default function Sparkline({ data }: SparklineProps) {
  const hasData = data && data.length >= 2;
  return (
    <div className="h-20 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 0, right: 0, top: 6, bottom: 0 }}>
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip cursor={false} contentStyle={{ fontSize: 12 }} formatter={(v: number) => v.toFixed(2)} labelFormatter={() => ""} />
          {hasData ? (
            <>
              <Line type="monotone" dataKey="v" stroke="#2563eb" strokeWidth={2.25} dot={{ r: 1.5 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="m" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.75} dot={false} isAnimationActive={false} />
            </>
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


