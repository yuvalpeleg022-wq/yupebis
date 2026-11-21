import { brand } from '../config/brand';
import { Reveal } from './Reveal';
import './About.css';

// DEMO CONTENT — replace with the dealership's real story, figures and services.
const pillars = [
  {
    title: 'Curated, not crowded',
    body: 'A deliberately small line-up. Every motorcycle on the floor is one our team would ride home themselves.',
  },
  {
    title: 'Test ride everything',
    body: 'Every model in the collection is available to ride — on real roads, at your pace, with a specialist alongside.',
  },
  {
    title: 'Set up for you',
    body: 'Suspension sag, lever reach, seat height: we fit the bike to the rider before you leave the showroom.',
  },
  {
    title: 'Looked after for life',
    body: 'Factory-trained technicians, genuine parts and a workshop that keeps you riding, season after season.',
  },
];

const stats = [
  { value: '3', label: 'Demo models in this showcase' },
  { value: '100%', label: 'Of the collection available to test ride' },
  { value: '1:1', label: 'Specialist for every visit' },
];

export function About() {
  return (
    <section id="about" className="section about" aria-labelledby="about-title">
      <div className="container about__grid">
        <Reveal className="about__intro">
          <p className="eyebrow">About {brand.name}</p>
          <h2 id="about-title" className="h2">
            A showroom
            <br />
            built by riders.
          </h2>
          <p className="lede">{brand.description}</p>
          <dl className="about__stats">
            {stats.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
          <p className="about__note">
            <span className="demo-tag">Placeholder copy</span> Replace with the dealership's own story and figures.
          </p>
        </Reveal>

        <ol className="about__pillars">
          {pillars.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 80}>
              <span className="about__num">0{i + 1}</span>
              <div>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
