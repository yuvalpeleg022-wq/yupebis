export type Canon = 'established' | 'fan-theory';

export interface Universe {
  id: string;
  name: string;
  designation: string;
  canon: Canon;
  color: string;
  description: string;
  characters: string[];
  works: string[];
}

/**
 * "Established" = depicted or named on screen in an MCU film or series.
 * "Fan theory" = popular speculation; never presented as fact.
 */
export const UNIVERSES: Universe[] = [
  {
    id: 'sacred', name: 'The Sacred Timeline', designation: 'Earth-616', canon: 'established', color: '#e8b04b',
    description: 'The primary MCU reality, guarded for ages by the Time Variance Authority. Most of the Infinity Saga takes place here.',
    characters: ['Tony Stark', 'Steve Rogers', 'Thor', 'Loki'],
    works: ['The Infinity Saga films', 'Loki (series)', 'Spider-Man: No Way Home'],
  },
  {
    id: 'quantum', name: 'The Quantum Realm', designation: 'Subatomic dimension', canon: 'established', color: '#22e58a',
    description: 'A realm beneath the scale of atoms where time behaves differently — the key to the Avengers’ Time Heist and Kang’s place of exile.',
    characters: ['Scott Lang', 'Janet van Dyne', 'Kang'],
    works: ['Ant-Man', 'Ant-Man and the Wasp', 'Avengers: Endgame', 'Ant-Man and the Wasp: Quantumania'],
  },
  {
    id: '838', name: 'Earth-838', designation: 'Earth-838', canon: 'established', color: '#2f7bff',
    description: 'A universe visited by Doctor Strange, protected by its own Illuminati and the Strange variant who sacrificed himself.',
    characters: ['Stephen Strange', 'America Chavez', 'Christine Palmer (838)', 'The Illuminati'],
    works: ['Doctor Strange in the Multiverse of Madness'],
  },
  {
    id: 'void', name: 'The Void', designation: 'End of Time', canon: 'established', color: '#a43bff',
    description: 'A wasteland where the TVA discards pruned variants, patrolled by the cloud-like Alioth.',
    characters: ['Loki variants', 'Sylvie', 'Cassandra Nova'],
    works: ['Loki (series)', 'Deadpool & Wolverine'],
  },
  {
    id: '828', name: 'Earth-828', designation: 'Earth-828', canon: 'established', color: '#ff8a1f',
    description: 'A retro-futuristic reality where the Fantastic Four protect a world shaped by 1960s optimism.',
    characters: ['Reed Richards', 'Sue Storm', 'Johnny Storm', 'Ben Grimm'],
    works: ['The Fantastic Four: First Steps'],
  },
  {
    id: 'incursion', name: 'The Incursion Theory', designation: 'Speculation', canon: 'fan-theory', color: '#ff2a3d',
    description: 'A popular fan theory that colliding universes — incursions — are building toward the end of the Multiverse Saga. Mentioned on screen, but how it plays out is unconfirmed.',
    characters: ['—'],
    works: ['Incursions referenced in Multiverse of Madness', 'Outcome unconfirmed'],
  },
];
