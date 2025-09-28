export type InsightEvent = {
  id: string; // `${player_id}:${stat}`
  ts: number;
  player_id: string;
  stat: string;
  value?: number;
  projection?: number;
  volatility?: number; // derived score
  status: "normal" | "warning" | "alert";
  confidence: number; // 0..100
  insight: string;
  reasons?: { feature: string; direction: string; magnitude?: number }[];
  highlight?: { start_sec: number; end_sec?: number };
};

type Handler = (evt: InsightEvent) => void;

class EventBus {
  private handlers: Set<Handler> = new Set();
  subscribe(h: Handler) {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }
  publish(evt: InsightEvent) {
    this.handlers.forEach((h) => h(evt));
  }
}

export const insightBus = new EventBus();



