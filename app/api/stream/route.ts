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
  const heroA = pool[0]?.id;
  const heroB = pool[1]?.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Emit events periodically
      let i = 0;
      while (i < 500) {
        // Force early surges at start so Reel populates fast
        let targetId = pool[(Math.random() * Math.max(pool.length, 1)) | 0]?.id;
        let value = Math.random() * 3;
        let projection = 25 + Math.random() * 10;
        if (i < 3 && heroA) {
          targetId = heroA; // first ticks guaranteed
          value = 7 + Math.random() * 2;
          projection = 32 + Math.random() * 6;
        } else if (i % 15 === 0 && heroB) {
          targetId = heroB;
          value = 6 + Math.random() * 2;
          projection = 30 + Math.random() * 8;
        }
        const evt = { ts: Date.now(), player_id: targetId ?? `p_${(Math.random() * 9999) | 0}`, stat: "points", value, projection };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
        i += 1;
        await sleep(300);
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


