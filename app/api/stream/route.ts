import { NextRequest } from "next/server";

export const runtime = "edge";

type PulsePlayer = { id: string; first_name?: string; last_name?: string };

async function fetchPlayers(origin: string): Promise<PulsePlayer[]> {
  const res = await fetch(`${origin}/api/pulse/v1/leagues/NFL/players`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const players = await fetchPlayers(origin);
  const pool = players.slice(0, 12); // focus on the first 12 so visible cards get updates
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Emit events periodically
      let i = 0;
      while (i < 500) {
        const p = pool[(Math.random() * Math.max(pool.length, 1)) | 0];
        const evt = {
          ts: Date.now(),
          player_id: p?.id ?? `p_${(Math.random() * 9999) | 0}`,
          stat: "points",
          value: Math.random() * 3,
          projection: 25 + Math.random() * 10,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
        i += 1;
        await sleep(400);
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}


