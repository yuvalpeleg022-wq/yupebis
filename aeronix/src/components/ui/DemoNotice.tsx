import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-3 rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-xs leading-relaxed text-silver">
      <Info size={15} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
