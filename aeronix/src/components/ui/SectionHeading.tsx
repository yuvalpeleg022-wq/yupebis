import type { ReactNode } from 'react';

interface Props {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  align?: 'left' | 'center';
  as?: 'h1' | 'h2';
}

export function SectionHeading({ eyebrow, title, children, align = 'left', as: Tag = 'h2' }: Props) {
  const center = align === 'center';
  return (
    <div className={center ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <p className={`eyebrow flex items-center gap-4 ${center ? 'justify-center' : ''}`}>
        <span className="h-px w-8 bg-gold" aria-hidden="true" />
        {eyebrow}
      </p>
      <Tag className="display mt-6 text-[clamp(2.4rem,6vw,5.2rem)] text-cloud">{title}</Tag>
      {children ? <div className="mt-6 text-base leading-relaxed text-silver md:text-lg">{children}</div> : null}
    </div>
  );
}
