import { NextRequest } from "next/server";

const PULSE_API_URL = process.env.PULSE_API_URL ?? "http://localhost:1339";

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const url = new URL(req.url);
  const { path } = await ctx.params;
  const target = `${PULSE_API_URL}/${path.join("/")}${url.search}`;
  const upstream = await fetch(target, { headers: { accept: "application/json" } });
  const data = await upstream.text();
  return new Response(data, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const url = new URL(req.url);
  const { path } = await ctx.params;
  const target = `${PULSE_API_URL}/${path.join("/")}${url.search}`;
  const upstream = await fetch(target, { method: "POST", body: await req.text(), headers: { "content-type": req.headers.get("content-type") ?? "application/json" } });
  const data = await upstream.text();
  return new Response(data, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}


