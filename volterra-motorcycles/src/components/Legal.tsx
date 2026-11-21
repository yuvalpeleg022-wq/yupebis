import { brand } from '../config/brand';
import { Modal } from './Modal';

export type LegalDoc = 'privacy' | 'terms';

/**
 * PLACEHOLDER LEGAL TEXT — not legal advice. Replace with documents
 * drafted for the dealership's jurisdiction before going live.
 */
const docs: Record<LegalDoc, { title: string; sections: { h: string; p: string }[] }> = {
  privacy: {
    title: 'Privacy policy',
    sections: [
      {
        h: 'About this placeholder',
        p: `This is placeholder text for the ${brand.fullName} showcase. A real privacy policy must be written for the dealership's jurisdiction (e.g. GDPR, CCPA) before the site goes live.`,
      },
      {
        h: 'What the demo collects',
        p: 'In its current demo state this website does not send, store or share any information entered into the test-ride form. No analytics or advertising trackers are installed.',
      },
      {
        h: 'What a live version would cover',
        p: 'The data collected (name, email, phone, preferred model and date), why it is collected, the legal basis, how long it is kept, who processes it, and how visitors can access or delete their data.',
      },
      {
        h: 'Third-party services',
        p: 'Fonts are loaded from Google Fonts. Any form provider, CRM or analytics tool added later must be listed here.',
      },
    ],
  },
  terms: {
    title: 'Terms of use',
    sections: [
      {
        h: 'About this placeholder',
        p: `These are placeholder terms for the ${brand.fullName} showcase and must be replaced with terms prepared for the dealership.`,
      },
      {
        h: 'Demonstration content',
        p: 'The motorcycles, specifications, prices and images on this website are fictional demonstration content. They do not describe real products and do not form an offer.',
      },
      {
        h: 'Test rides',
        p: 'A live version would set out test-ride eligibility (licence category, age, insurance, deposit), safety equipment requirements and the rider’s responsibilities.',
      },
      {
        h: '3D models and imagery',
        p: '3D models and renders are illustrative. Colours and finishes may differ from the physical motorcycle.',
      },
    ],
  },
};

export function Legal({ doc, onClose }: { doc: LegalDoc | null; onClose: () => void }) {
  const d = doc ? docs[doc] : null;
  return (
    <Modal open={doc != null} onClose={onClose} label={d?.title ?? 'Legal'}>
      {d && (
        <article className="legal">
          <p className="eyebrow">{brand.fullName}</p>
          <h2 className="legal__title">{d.title}</h2>
          <p className="demo-tag">Placeholder document</p>
          {d.sections.map((s) => (
            <section key={s.h}>
              <h3>{s.h}</h3>
              <p>{s.p}</p>
            </section>
          ))}
        </article>
      )}
    </Modal>
  );
}
