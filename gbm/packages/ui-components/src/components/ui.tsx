import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...v: (string | false | null | undefined)[]) {
  return twMerge(clsx(v));
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({ variant = 'secondary', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...p}
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'bg-accent text-white hover:bg-accent/85',
        variant === 'secondary' && 'border border-line bg-surface-2 text-ink hover:bg-line/60',
        variant === 'ghost' && 'text-muted hover:bg-surface-2 hover:text-ink',
        variant === 'danger' && 'bg-bad/90 text-white hover:bg-bad',
        className,
      )}
    />
  );
}

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('min-w-0 rounded-xl border border-line bg-surface', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-semibold tracking-wide text-ink">{title}</h2>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Badge({ tone = 'neutral', children, title }: { tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'accent' | 'real' | 'fictional'; children: ReactNode; title?: string }) {
  const tones = {
    neutral: 'bg-line text-muted',
    good: 'bg-good/15 text-good',
    warn: 'bg-warn/15 text-warn',
    bad: 'bg-bad/15 text-bad',
    accent: 'bg-accent/15 text-accent',
    real: 'bg-real/15 text-real',
    fictional: 'bg-fictional/15 text-fictional',
  };
  return <span title={title} className={cn('inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide', tones[tone])}>{children}</span>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-surface-2 px-3 py-2">
      <div className="truncate text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className="tabular truncate text-lg font-semibold">{value}</div>
      {sub && <div className="truncate text-xs text-muted">{sub}</div>}
    </div>
  );
}

/** Horizontally scrollable table wrapper: the page itself never overflows. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="-mx-4 overflow-x-auto px-4"><table className="tabular w-full min-w-max border-collapse text-sm">{children}</table></div>;
}
export const th = 'border-b border-line px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted';
export const td = 'border-b border-line/50 px-2 py-1.5';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-muted">
      {label}
      {children}
    </label>
  );
}
export const inputCls = 'min-h-10 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus:border-accent';

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}

export function InDevelopment({ feature, detail }: { feature: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">
      <Badge tone="warn">In development</Badge>
      <p className="mt-2 font-medium text-ink">{feature}</p>
      <p className="mt-1">{detail}</p>
    </div>
  );
}

export function RatingBar({ value }: { value: number }) {
  const tone = value >= 80 ? 'bg-good' : value >= 65 ? 'bg-accent' : value >= 50 ? 'bg-warn' : 'bg-bad';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded bg-line"><div className={cn('h-full', tone)} style={{ width: `${value}%` }} /></div>
      <span className="tabular w-6 text-right text-xs">{value}</span>
    </div>
  );
}

export function OvrPill({ value }: { value: number }) {
  const tone = value >= 80 ? 'text-good' : value >= 70 ? 'text-accent' : value >= 60 ? 'text-ink' : 'text-muted';
  return <span className={cn('tabular inline-block w-8 rounded bg-surface-2 text-center text-sm font-bold', tone)}>{value}</span>;
}
