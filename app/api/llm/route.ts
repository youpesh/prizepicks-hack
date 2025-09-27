import { NextRequest } from "next/server";

type Payload = {
  entity_key: string;
  features: {
    z?: number;
    ewma?: number;
    value?: number;
    projection?: number;
    risk?: number;
    confidence?: number;
  };
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Payload;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (apiKey) {
    try {
      const sys = {
        role: "system",
        content:
          "You generate concise, evidence-grounded explanations for sports stat shifts. Output strict JSON with keys: insight, reasons[]. Limit to 1-2 reasons. Be concrete (pace/usage proxy via z, ewma delta, risk).",
      };
      const user = {
        role: "user",
        content: JSON.stringify(body),
      };
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages: [sys, user], response_format: { type: "json_object" } }),
      });
      const j = await r.json();
      const text = j.choices?.[0]?.message?.content ?? "{}";
      return new Response(text, { headers: { "content-type": "application/json" } });
    } catch {
      // fallthrough
    }
  }

  const { z = 0, ewma = 0, value = 0, risk = 0, confidence = 0, projection = 0 } = body.features || {};
  const ewmaDelta = value - ewma;
  const dir = ewmaDelta >= 0 ? "up" : "down";
  const insight = Math.abs(z) > 1.8 ? (z > 0 ? "Momentum surge detected" : "Momentum drop detected") : risk > 60 ? "Elevated volatility" : "Stable";
  const reasons = [
    { feature: "z_score", direction: z >= 0 ? "up" : "down", magnitude: Math.abs(z) },
    { feature: "ewma_delta", direction: dir, magnitude: Math.abs(ewmaDelta) },
  ];
  return new Response(JSON.stringify({ insight, confidence: confidence / 100, reasons, projection }), {
    headers: { "content-type": "application/json" },
  });
}


