"use client";

import { useEffect, useRef, useState } from "react";

export type Insight = {
  id: string;
  title: string;
  insight: string;
  confidence: number; // 0..100
  status: "normal" | "warning" | "alert";
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function useInsights(initial: string[]) {
  const [insights, setInsights] = useState<Record<string, Insight>>(() => {
    const seed: Record<string, Insight> = {};
    initial.forEach((id, i) => {
      seed[id] = {
        id,
        title: id,
        insight: "Awaiting signal…",
        confidence: 0,
        status: "normal",
      };
    });
    return seed;
  });

  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Simulate streaming updates at 800ms cadence
    timer.current = setInterval(() => {
      setInsights((prev) => {
        const next: Record<string, Insight> = { ...prev };
        Object.values(next).forEach((it) => {
          const delta = (Math.random() - 0.5) * 10;
          const conf = clamp(it.confidence + delta, 0, 100);
          let status: Insight["status"] = "normal";
          if (conf > 70) status = "alert";
          else if (conf > 40) status = "warning";
          it.confidence = conf;
          it.status = status;
          it.insight = status === "alert" ? "Momentum surge detected" : status === "warning" ? "Volatility rising" : "Stable";
        });
        return next;
      });
    }, 800);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  return insights;
}


