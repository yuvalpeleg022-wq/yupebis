"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api";

/** Development-only stand-in for the payment provider's hosted checkout page. */
function MockCheckout() {
  const sp = useSearchParams();
  const router = useRouter();
  const order = sp.get("order");
  const sub = sp.get("subscription");
  const [state, setState] = useState("");

  async function complete(succeed: boolean) {
    setState("Processing…");
    try {
      const sim = await api<{ body: string; headers: Record<string, string> }>(
        order ? `/dev/simulate-payment/${order}?succeed=${succeed}` : `/dev/simulate-subscription/${sub}`, { method: "POST" });
      const res = await fetch("/api/webhooks/payments/mock", { method: "POST", body: sim.body, headers: sim.headers });
      const j = await res.json();
      setState(`Webhook result: ${j.status}`);
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (e) { setState((e as Error).message); }
  }

  return (
    <div className="mx-auto max-w-md py-24">
      <div className="card space-y-5 p-8">
        <p className="text-xs uppercase tracking-widest text-amber-400">Test mode · mock payment provider</p>
        <h1 className="font-display text-3xl">{order ? "Complete your purchase" : "Activate AI Editor"}</h1>
        <p className="text-sm text-white/60">
          No real payment is taken. A real provider will replace this page once it is selected and approved.
        </p>
        <div className="flex gap-3">
          <button className="btn-primary flex-1" onClick={() => complete(true)}>Pay (success)</button>
          {order && <button className="btn-ghost" onClick={() => complete(false)}>Fail</button>}
        </div>
        {state && <p className="text-sm text-white/70" role="status">{state}</p>}
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><MockCheckout /></Suspense>;
}
