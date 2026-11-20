import type { StoneId } from './films';

export interface Stone {
  id: StoneId;
  name: string;
  color: string;
  /** Secondary tint used for the environment around the stone. */
  deep: string;
  domain: string;
  power: string;
  vessel: string;
  history: string;
  appearances: string[];
  /** Shape language for the procedural environment around the stone. */
  environment: 'lattice' | 'neural' | 'fluid' | 'shards' | 'rings' | 'void';
}

export const STONES: Stone[] = [
  {
    id: 'space', name: 'Space Stone', color: '#2f7bff', deep: '#071a4a', domain: 'Space',
    power: 'Grants mastery over space — opening portals and moving instantly across any distance.',
    vessel: 'The Tesseract',
    history: 'Hidden on Earth for centuries, seized by HYDRA in WWII, studied by S.H.I.E.L.D. and used by Loki to open a portal over New York. Kept on Asgard until Loki surrendered it to Thanos.',
    appearances: ['Captain America: The First Avenger', 'Thor', 'The Avengers', 'Captain Marvel', 'Thor: Ragnarok', 'Avengers: Infinity War', 'Avengers: Endgame'],
    environment: 'lattice',
  },
  {
    id: 'mind', name: 'Mind Stone', color: '#ffd23f', deep: '#3a2a00', domain: 'Mind',
    power: 'Controls and enhances minds — granting consciousness, telepathy and influence over others.',
    vessel: 'Loki’s Scepter, later Vision’s brow',
    history: 'Given to Loki by Thanos, taken by HYDRA, used to empower Wanda and Pietro Maximoff, and ultimately gave life to Vision before Thanos tore it from him in Wakanda.',
    appearances: ['The Avengers', 'Captain America: The Winter Soldier', 'Avengers: Age of Ultron', 'Captain America: Civil War', 'Avengers: Infinity War', 'Avengers: Endgame'],
    environment: 'neural',
  },
  {
    id: 'reality', name: 'Reality Stone', color: '#ff2a3d', deep: '#3d0008', domain: 'Reality',
    power: 'Rewrites the fabric of reality, turning illusion into truth and matter into anything.',
    vessel: 'The Aether',
    history: 'A fluid weapon wielded by Malekith and the Dark Elves. After the Convergence it was entrusted to the Collector on Knowhere, where Thanos claimed it.',
    appearances: ['Thor: The Dark World', 'Avengers: Infinity War', 'Avengers: Endgame'],
    environment: 'fluid',
  },
  {
    id: 'power', name: 'Power Stone', color: '#a43bff', deep: '#22053d', domain: 'Power',
    power: 'Raw, overwhelming energy — capable of annihilating entire planets.',
    vessel: 'The Orb',
    history: 'Hidden on Morag, stolen by Peter Quill, sought by Ronan the Accuser and later safeguarded by the Nova Corps on Xandar until Thanos decimated the planet.',
    appearances: ['Guardians of the Galaxy', 'Avengers: Infinity War', 'Avengers: Endgame'],
    environment: 'shards',
  },
  {
    id: 'time', name: 'Time Stone', color: '#22e58a', deep: '#00301a', domain: 'Time',
    power: 'Manipulates time — rewinding, accelerating, and viewing possible futures.',
    vessel: 'The Eye of Agamotto',
    history: 'Protected by the Masters of the Mystic Arts in Kamar-Taj. Stephen Strange used it to bargain with Dormammu and later surrendered it to Thanos on Titan.',
    appearances: ['Doctor Strange', 'Avengers: Infinity War', 'Avengers: Endgame'],
    environment: 'rings',
  },
  {
    id: 'soul', name: 'Soul Stone', color: '#ff8a1f', deep: '#3a1600', domain: 'Soul',
    power: 'Holds power over life and the soul; its full nature is the least understood of the six.',
    vessel: 'None — kept on Vormir',
    history: 'Guarded on Vormir by the Red Skull. It demands a sacrifice of the one you love: Gamora in Infinity War, Natasha Romanoff in Endgame.',
    appearances: ['Avengers: Infinity War', 'Avengers: Endgame'],
    environment: 'void',
  },
];

export const STONE_BY_ID = Object.fromEntries(STONES.map((s) => [s.id, s])) as Record<StoneId, Stone>;
