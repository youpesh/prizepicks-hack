import { NextRequest } from "next/server";

// Minimal stub for TwelveLabs highlight search. In demo mode, it returns a
// locally hosted sample clip URL. If TWELVELABS_API_KEY is set, it will call
// the API with basic parameters and return the first clip URL when available.

type Query = {
  q?: string; // free text
  start_ms?: string; // preferred window start
  end_ms?: string; // preferred window end
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const params: Query = Object.fromEntries(searchParams) as unknown as Query;
  if (searchParams.has("check")) {
    const hasKey = Boolean(process.env.TWELVELABS_API_KEY);
    return Response.json({ provider: hasKey ? "twelvelabs" : "local" });
  }

  const key = process.env.TWELVELABS_API_KEY;
  const envIndex = process.env.TL_INDEX_ID || process.env.TWELVELABS_INDEX_ID;
  const indexId = (params as any).index_id || envIndex;
  const videoId = (params as any).video_id;
  if (key) {
    try {
      // This is a placeholder endpoint structure; adapt to real TwelveLabs API.
      // Prefer v1.2 index-scoped search; fallback to legacy v1 if needed
      const endpointV12 = indexId ? `https://api.twelvelabs.io/v1.2/indexes/${indexId}/search` : "";
      const bodyObj: Record<string, unknown> = {
        query: params.q ?? "basketball turnover fastbreak",
        page: 1,
        page_limit: 1,
      };
      if (videoId) bodyObj["video_id"] = videoId;
      const body = JSON.stringify(bodyObj);
      // Attempt with x-api-key (most common) then fallback to Bearer
      const doFetch = (bodyJson: string, useBearer = false) =>
        fetch(endpointV12 || "https://api.twelvelabs.io/v1/search", {
        method: "POST",
          headers: useBearer
            ? {
                "Content-Type": "application/json",
                Authorization: `Bearer ${key}`,
              }
            : {
                "Content-Type": "application/json",
                "x-api-key": key,
              },
          body: bodyJson,
        });

      let r = await doFetch(body, false);
      if (!r.ok) r = await doFetch(body, true);

      if (!r.ok) {
        // Second attempt with alternate payload shape
        const alt = JSON.stringify({ text: (bodyObj.query as string) ?? "basketball", page: 1, page_limit: 1, ...(videoId ? { video_id: videoId } : {}) });
        r = await doFetch(alt, false);
        if (!r.ok) r = await doFetch(alt, true);
      }

      if (r.ok) {
        const j = await r.json();
        if (searchParams.has("debug")) {
          return Response.json({ provider: "twelvelabs", endpoint: endpointV12 || "v1/search", raw: j });
        }
        // Try several likely shapes
        const url = j?.results?.[0]?.url || j?.data?.[0]?.url || j?.clips?.[0]?.url || j?.items?.[0]?.url || "/sample.mp4";
        return Response.json({ url });
      } else if (searchParams.has("debug")) {
        const errText = await r.text().catch(() => "");
        return Response.json({ provider: "twelvelabs", endpoint: endpointV12 || "v1/search", status: r.status, error: errText || "non-ok response" });
      }
    } catch {
      // fallthrough to demo clip
    }
  }

  // Demo fallback: serve local sample clip
  return Response.json({ url: "/sample.mp4" });
}


