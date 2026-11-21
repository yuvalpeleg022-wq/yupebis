/**
 * TEST-RIDE REQUEST SUBMISSION
 * ------------------------------------------------------------------
 * No backend is connected by default, so requests are NOT sent
 * anywhere — the form runs in DEMO mode and says so to the visitor.
 *
 * To connect a real service, set an endpoint at build time:
 *
 *   VITE_TEST_RIDE_ENDPOINT=https://formspree.io/f/xxxxxxx   (or your own API)
 *
 * The request body is JSON (see `TestRideRequest`). Any endpoint that
 * accepts a JSON POST works: Formspree, Basin, Getform, a Netlify /
 * Vercel / Cloudflare function that forwards to a CRM or email, etc.
 * Never put API secrets in VITE_* variables — they are bundled into the
 * client. Keep secrets inside the server-side function instead.
 */
export interface TestRideRequest {
  fullName: string;
  email: string;
  phone: string;
  motorcycleId: string;
  motorcycleName: string;
  preferredDate: string;
  message: string;
  consent: boolean;
  submittedAt: string;
}

export type SubmitResult = { mode: 'demo' } | { mode: 'live' };

const ENDPOINT = (import.meta.env.VITE_TEST_RIDE_ENDPOINT as string | undefined)?.trim() || '';

export const isFormLive = ENDPOINT.length > 0;

export async function submitTestRide(data: TestRideRequest): Promise<SubmitResult> {
  if (!isFormLive) {
    // Demo: simulate network latency, send nothing.
    await new Promise((r) => setTimeout(r, 900));
    if (import.meta.env.DEV) console.info('[Volterra demo] Test-ride request (not sent):', data);
    return { mode: 'demo' };
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return { mode: 'live' };
}
