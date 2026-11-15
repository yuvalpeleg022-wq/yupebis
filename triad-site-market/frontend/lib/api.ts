export type User = { id: string; email: string; full_name: string | null; role: "customer" | "admin" };

export type WebsiteCard = {
  id: string; sku: string; slug: string; title: string; tagline: string; category: string;
  design_direction: string; price_cents: number; currency: string; quality_score: number;
  page_count: number; listed_at: string | null;
};

export type WebsiteDetail = WebsiteCard & {
  pages: { slug: string; title: string }[];
  theme: { palette: Record<string, string>; fonts: string[] };
  status: "available" | "unavailable";
};

export type Item = { title: string; text: string; meta: string; image?: { src: string; alt: string; license: string } | null };
export type Section = {
  id: string; type: string; variant: string; eyebrow: string; heading: string; body: string;
  items: Item[]; links: { label: string; href: string }[]; background: string;
};
export type Spec = {
  meta: { business_name: string; tagline: string; category: string; design_direction: string };
  theme: { palette: Record<string, string>; typography: Record<string, unknown>; [k: string]: unknown };
  pages: { slug: string; title: string; description: string; sections: Section[] }[];
};
export type CustomerSite = {
  id: string; website_id: string; name: string; revision: number; updated_at: string;
  spec: Spec; sku: string; acquired_at: string; license_terms_version: string;
};
export type Subscription = {
  id: string; plan: string; status: string; monthly_allowance: number; current_period_end: string; used_this_period: number;
};

const TOKEN_KEY = "triad_token";

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t: string | null) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) { headers.set("Content-Type", "application/json"); body = JSON.stringify(init.json); }
  const res = await fetch(`/api${path}`, { ...init, headers, body });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail ?? j);
    } catch { /* not json */ }
    throw new ApiError(res.status, msg);
  }
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json") ? res.json() : res.blob()) as Promise<T>;
}

export function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-IL", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

export const label = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
