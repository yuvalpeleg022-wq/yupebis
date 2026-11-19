import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'ghost' | 'gold';
type Size = 'sm' | 'md' | 'lg';

const base =
  'group relative inline-flex items-center gap-3 rounded-full font-semibold uppercase tracking-[0.22em] transition-[background-color,color,border-color,transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary: 'bg-cloud text-navy-950 hover:bg-white hover:shadow-[0_10px_40px_-10px_rgba(244,247,250,0.55)]',
  ghost: 'border border-silver/35 text-cloud hover:border-cloud hover:bg-cloud/5',
  gold: 'border border-gold/60 text-gold hover:bg-gold hover:text-navy-950',
};

const sizes: Record<Size, string> = {
  sm: 'px-5 py-2.5 text-[0.62rem]',
  md: 'px-7 py-3.5 text-[0.68rem]',
  lg: 'px-9 py-4.5 text-[0.72rem]',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  icon?: ReactNode;
}

function Inner({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <>
      <span>{children}</span>
      {icon ? <span className="transition-transform duration-500 group-hover:translate-x-1">{icon}</span> : null}
    </>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  icon,
  type = 'button',
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      <Inner icon={icon}>{children}</Inner>
    </button>
  );
}

export function ButtonLink({ to, variant = 'primary', size = 'md', className = '', children, icon }: CommonProps & { to: string }) {
  return (
    <Link to={to} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      <Inner icon={icon}>{children}</Inner>
    </Link>
  );
}
