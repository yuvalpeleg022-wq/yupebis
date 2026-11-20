import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function SectionHeading({ index, eyebrow, title, children, align = 'left' }: {
  index: string; eyebrow: string; title: ReactNode; children?: ReactNode; align?: 'left' | 'center';
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}
    >
      <p className="eyebrow flex items-center gap-3" style={align === 'center' ? { justifyContent: 'center' } : undefined}>
        <span className="text-mist">{index}</span><span className="h-px w-8 bg-gold/50" />{eyebrow}
      </p>
      <h2 className="display mt-4 text-6xl sm:text-7xl lg:text-8xl">{title}</h2>
      {children && <div className="mt-5 max-w-2xl text-base leading-relaxed text-mist sm:text-lg">{children}</div>}
    </motion.header>
  );
}
