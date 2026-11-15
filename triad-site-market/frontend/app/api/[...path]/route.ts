import type { NextRequest } from "next/server";

/**
 * Same-origin proxy to the backend API. The target is read at runtime (TRIAD_API_URL), so one
 * built image works in every environment. Bodies are passed through byte-for-byte.
 */
export const dynamic = "force-dynamic";

function target(): string {
  const raw = process.env.TRIAD_API_URL || "http://localhost:8000";
  return (/^https?:\/\//.test(raw) ? raw : `http://${raw}`).replace(/\/$/, "");
}

const DROP_REQ = new Set(["host", "connection", "content-length", "accept-encoding"]);
const DROP_RES = new Set(["content-encoding", "content-length", "transfer-encoding", "connection"]);

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = `${target()}/api/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const headers = new Headers();
  req.headers.forEach((v, k) => { if (!DROP_REQ.has(k)) headers.set(k, v); });
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  let res: Response;
  try {
    res = await fetch(url, {
      method: req.method, headers, body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: "manual", cache: "no-store",
    });
  } catch {
    return Response.json({ detail: "The API is not reachable right now. Please try again." }, { status: 502 });
  }
  const out = new Headers();
  res.headers.forEach((v, k) => { if (!DROP_RES.has(k)) out.set(k, v); });
  return new Response(res.body, { status: res.status, headers: out });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
