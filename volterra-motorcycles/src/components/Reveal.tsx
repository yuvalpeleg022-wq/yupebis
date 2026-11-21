import { useRef, type ElementType, type ReactNode, type CSSProperties } from 'react';
import { useInView } from '../hooks/useInView';

interface Props {
  as?: ElementType;
  className?: string;
  delay?: number;
  children: ReactNode;
  style?: CSSProperties;
}

/** Fades content up once it scrolls into view (disabled under reduced motion via CSS). */
export function Reveal({ as: Tag = 'div', className = '', delay = 0, children, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { once: true, rootMargin: '0px 0px -10% 0px' });
  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}
