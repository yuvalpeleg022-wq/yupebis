/**
 * MCU theatrical films, Phases One–Six.
 *
 * Titles and release years follow the studio's published release history.
 * Descriptions are short original summaries written for this fan project.
 * `status: 'announced'` marks films that, at the time this data was written,
 * had a scheduled date but had not yet been released — re-verify before shipping.
 */

export type Phase = 1 | 2 | 3 | 4 | 5 | 6;

export interface Film {
  slug: string;
  title: string;
  year: number;
  phase: Phase;
  /** Key into the poster manifest (src/config/assets.ts). */
  poster: string;
  summary: string;
  characters: string[];
  connections: string[];
  /** Infinity Stones that appear or are central. */
  stones?: StoneId[];
  status?: 'released' | 'announced';
}

export type StoneId = 'space' | 'mind' | 'reality' | 'power' | 'time' | 'soul';

export const PHASE_META: Record<Phase, { label: string; span: string; saga: string; accent: string }> = {
  1: { label: 'Phase One', span: '2008 — 2012', saga: 'The Infinity Saga', accent: '#c8102e' },
  2: { label: 'Phase Two', span: '2013 — 2015', saga: 'The Infinity Saga', accent: '#e8b04b' },
  3: { label: 'Phase Three', span: '2016 — 2019', saga: 'The Infinity Saga', accent: '#a43bff' },
  4: { label: 'Phase Four', span: '2021 — 2022', saga: 'The Multiverse Saga', accent: '#22e58a' },
  5: { label: 'Phase Five', span: '2023 — 2025', saga: 'The Multiverse Saga', accent: '#2f7bff' },
  6: { label: 'Phase Six', span: '2025 — 2027', saga: 'The Multiverse Saga', accent: '#ff8a1f' },
};

export const FILMS: Film[] = [
  // ───────────── Phase One ─────────────
  {
    slug: 'iron-man', title: 'Iron Man', year: 2008, phase: 1, poster: 'im1',
    summary: 'Captured in Afghanistan, weapons magnate Tony Stark builds an armored suit to escape — and returns home determined to stop his company’s weapons from reaching the wrong hands.',
    characters: ['Tony Stark', 'Pepper Potts', 'James Rhodes', 'Obadiah Stane'],
    connections: ['Introduces S.H.I.E.L.D. and Nick Fury’s Avengers Initiative', 'Ends with “I am Iron Man.”'],
  },
  {
    slug: 'incredible-hulk', title: 'The Incredible Hulk', year: 2008, phase: 1, poster: 'hulk',
    summary: 'On the run from the U.S. military, Bruce Banner searches for a cure while General Ross pursues him and a soldier is transformed into the Abomination.',
    characters: ['Bruce Banner', 'Betty Ross', 'Thaddeus Ross', 'Emil Blonsky'],
    connections: ['Thaddeus Ross returns as Secretary of State in Civil War', 'Tony Stark cameo'],
  },
  {
    slug: 'iron-man-2', title: 'Iron Man 2', year: 2010, phase: 1, poster: 'im2',
    summary: 'With the world knowing his identity, Tony faces government pressure, a failing arc reactor and Ivan Vanko’s vendetta against the Stark legacy.',
    characters: ['Tony Stark', 'Natasha Romanoff', 'James Rhodes', 'Ivan Vanko'],
    connections: ['Introduces Natasha Romanoff and War Machine', 'Howard Stark’s research hints at the Tesseract'],
  },
  {
    slug: 'thor', title: 'Thor', year: 2011, phase: 1, poster: 'thor1',
    summary: 'Banished to Earth by Odin, the arrogant Thor must prove himself worthy while his brother Loki schemes for the throne of Asgard.',
    characters: ['Thor', 'Loki', 'Odin', 'Jane Foster'],
    connections: ['First appearance of Loki and Hawkeye', 'Post-credit scene reveals the Tesseract'],
    stones: ['space'],
  },
  {
    slug: 'captain-america-first-avenger', title: 'Captain America: The First Avenger', year: 2011, phase: 1, poster: 'cap1',
    summary: 'In 1940s Brooklyn, frail Steve Rogers becomes a super-soldier and leads the fight against HYDRA and the Red Skull, who wields the Tesseract.',
    characters: ['Steve Rogers', 'Peggy Carter', 'Bucky Barnes', 'Red Skull'],
    connections: ['Origin of the Tesseract on Earth', 'Red Skull later reappears on Vormir'],
    stones: ['space'],
  },
  {
    slug: 'the-avengers', title: 'The Avengers', year: 2012, phase: 1, poster: 'av1',
    summary: 'Nick Fury assembles Earth’s mightiest heroes when Loki steals the Tesseract and opens a portal for an alien invasion of New York.',
    characters: ['Tony Stark', 'Steve Rogers', 'Thor', 'Natasha Romanoff', 'Bruce Banner', 'Clint Barton', 'Loki'],
    connections: ['Loki’s scepter houses the Mind Stone', 'Post-credit scene introduces Thanos'],
    stones: ['space', 'mind'],
  },

  // ───────────── Phase Two ─────────────
  {
    slug: 'iron-man-3', title: 'Iron Man 3', year: 2013, phase: 2, poster: 'im3',
    summary: 'Haunted by the Battle of New York, Tony faces a terrorist known as the Mandarin and the Extremis program while his own world is torn apart.',
    characters: ['Tony Stark', 'Pepper Potts', 'James Rhodes', 'Aldrich Killian'],
    connections: ['Explores Tony’s post-New York anxiety', 'The Mandarin thread continues in Shang-Chi'],
  },
  {
    slug: 'thor-the-dark-world', title: 'Thor: The Dark World', year: 2013, phase: 2, poster: 'thor2',
    summary: 'Malekith and the Dark Elves rise to reclaim the Aether, forcing Thor into an uneasy alliance with the imprisoned Loki.',
    characters: ['Thor', 'Loki', 'Jane Foster', 'Malekith'],
    connections: ['The Aether is revealed as the Reality Stone', 'Aether handed to the Collector'],
    stones: ['reality'],
  },
  {
    slug: 'captain-america-winter-soldier', title: 'Captain America: The Winter Soldier', year: 2014, phase: 2, poster: 'cap2',
    summary: 'Steve Rogers uncovers a conspiracy inside S.H.I.E.L.D. and faces a deadly assassin with a face from his past.',
    characters: ['Steve Rogers', 'Natasha Romanoff', 'Sam Wilson', 'Bucky Barnes'],
    connections: ['S.H.I.E.L.D. falls; HYDRA revealed within', 'Post-credit scene shows Loki’s scepter and the Maximoff twins'],
    stones: ['mind'],
  },
  {
    slug: 'guardians-of-the-galaxy', title: 'Guardians of the Galaxy', year: 2014, phase: 2, poster: 'gotg1',
    summary: 'Outlaw Peter Quill steals a mysterious Orb and forms an unlikely team of misfits to keep it from Ronan the Accuser.',
    characters: ['Peter Quill', 'Gamora', 'Drax', 'Rocket', 'Groot', 'Nebula'],
    connections: ['The Orb contains the Power Stone', 'Thanos’s adopted daughters Gamora and Nebula introduced'],
    stones: ['power'],
  },
  {
    slug: 'avengers-age-of-ultron', title: 'Avengers: Age of Ultron', year: 2015, phase: 2, poster: 'av2',
    summary: 'Tony’s attempt at a peacekeeping A.I. gives rise to Ultron, a machine intent on human extinction.',
    characters: ['Tony Stark', 'Steve Rogers', 'Wanda Maximoff', 'Vision', 'Ultron'],
    connections: ['The Mind Stone gives life to Vision', 'Thor sees a vision of the Infinity Stones'],
    stones: ['mind'],
  },
  {
    slug: 'ant-man', title: 'Ant-Man', year: 2015, phase: 2, poster: 'antman1',
    summary: 'Ex-con Scott Lang is recruited by Hank Pym to wear a shrinking suit and pull off a heist to protect Pym’s technology.',
    characters: ['Scott Lang', 'Hank Pym', 'Hope van Dyne', 'Darren Cross'],
    connections: ['Introduces the Quantum Realm', 'Sets up Scott’s role in the Time Heist'],
  },

  // ───────────── Phase Three ─────────────
  {
    slug: 'captain-america-civil-war', title: 'Captain America: Civil War', year: 2016, phase: 3, poster: 'cw',
    summary: 'The Sokovia Accords divide the Avengers, pitting Captain America and Iron Man against each other.',
    characters: ['Steve Rogers', 'Tony Stark', 'Bucky Barnes', 'T’Challa', 'Peter Parker'],
    connections: ['Introduces Black Panther and Peter Parker', 'Avengers fractured before Thanos arrives'],
    stones: ['mind'],
  },
  {
    slug: 'doctor-strange', title: 'Doctor Strange', year: 2016, phase: 3, poster: 'ds1',
    summary: 'After a career-ending accident, surgeon Stephen Strange studies the mystic arts under the Ancient One.',
    characters: ['Stephen Strange', 'The Ancient One', 'Wong', 'Kaecilius'],
    connections: ['The Eye of Agamotto holds the Time Stone', 'Introduces the Dark Dimension and the multiverse'],
    stones: ['time'],
  },
  {
    slug: 'guardians-vol-2', title: 'Guardians of the Galaxy Vol. 2', year: 2017, phase: 3, poster: 'gotg2',
    summary: 'The Guardians meet Ego, a living planet who claims to be Peter Quill’s father.',
    characters: ['Peter Quill', 'Gamora', 'Nebula', 'Yondu', 'Ego'],
    connections: ['Deepens Gamora and Nebula’s history with Thanos', 'Introduces Mantis'],
  },
  {
    slug: 'spider-man-homecoming', title: 'Spider-Man: Homecoming', year: 2017, phase: 3, poster: 'homecoming',
    summary: 'Under Tony Stark’s mentorship, Peter Parker balances high school with stopping the Vulture’s alien-tech arms trade.',
    characters: ['Peter Parker', 'Tony Stark', 'Adrian Toomes', 'May Parker'],
    connections: ['Tony and Peter’s mentorship', 'Chitauri salvage from the Battle of New York'],
  },
  {
    slug: 'thor-ragnarok', title: 'Thor: Ragnarok', year: 2017, phase: 3, poster: 'ragnarok',
    summary: 'Imprisoned on Sakaar, Thor must escape and return to Asgard to stop his sister Hela from bringing about Ragnarok.',
    characters: ['Thor', 'Loki', 'Bruce Banner', 'Valkyrie', 'Hela'],
    connections: ['Asgard destroyed', 'Loki takes the Tesseract; Thanos’s ship appears'],
    stones: ['space'],
  },
  {
    slug: 'black-panther', title: 'Black Panther', year: 2018, phase: 3, poster: 'bp1',
    summary: 'T’Challa returns to Wakanda as king and faces Erik Killmonger, who challenges his claim to the throne.',
    characters: ['T’Challa', 'Shuri', 'Okoye', 'Nakia', 'Erik Killmonger'],
    connections: ['Wakanda opens to the world', 'Wakanda becomes the battlefield in Infinity War'],
  },
  {
    slug: 'avengers-infinity-war', title: 'Avengers: Infinity War', year: 2018, phase: 3, poster: 'iw',
    summary: 'Thanos sets out to collect all six Infinity Stones, and the Avengers and their allies make a final stand to stop him.',
    characters: ['Thanos', 'Tony Stark', 'Thor', 'Stephen Strange', 'Peter Parker', 'Gamora', 'Wanda Maximoff'],
    connections: ['All six stones gathered', 'The Snap erases half of all life'],
    stones: ['space', 'mind', 'reality', 'power', 'time', 'soul'],
  },
  {
    slug: 'ant-man-and-the-wasp', title: 'Ant-Man and the Wasp', year: 2018, phase: 3, poster: 'antman2',
    summary: 'Scott Lang and Hope van Dyne enter the Quantum Realm to rescue Janet van Dyne, pursued by the phasing Ghost.',
    characters: ['Scott Lang', 'Hope van Dyne', 'Janet van Dyne', 'Ghost'],
    connections: ['Scott trapped in the Quantum Realm during the Snap', 'Quantum travel becomes the key to time travel'],
  },
  {
    slug: 'captain-marvel', title: 'Captain Marvel', year: 2019, phase: 3, poster: 'cm',
    summary: 'In the 1990s, Kree warrior Vers discovers her past as U.S. Air Force pilot Carol Danvers amid the Kree–Skrull war.',
    characters: ['Carol Danvers', 'Nick Fury', 'Talos', 'Maria Rambeau'],
    connections: ['Carol’s powers come from the Tesseract’s energy', 'Fury’s pager from Infinity War explained'],
    stones: ['space'],
  },
  {
    slug: 'avengers-endgame', title: 'Avengers: Endgame', year: 2019, phase: 3, poster: 'eg',
    summary: 'Five years after the Snap, the surviving Avengers travel through time to retrieve the stones and undo Thanos’s act.',
    characters: ['Tony Stark', 'Steve Rogers', 'Thor', 'Natasha Romanoff', 'Bruce Banner', 'Clint Barton', 'Thanos'],
    connections: ['The Time Heist', 'Tony Stark’s final snap', 'Steve passes on the shield'],
    stones: ['space', 'mind', 'reality', 'power', 'time', 'soul'],
  },
  {
    slug: 'spider-man-far-from-home', title: 'Spider-Man: Far From Home', year: 2019, phase: 3, poster: 'ffh',
    summary: 'Grieving Tony Stark, Peter Parker’s school trip to Europe is upended by Mysterio and a supposed multiverse threat.',
    characters: ['Peter Parker', 'Quentin Beck', 'Nick Fury', 'MJ', 'Happy Hogan'],
    connections: ['The world after Endgame', 'Peter’s identity is revealed'],
  },

  // ───────────── Phase Four ─────────────
  {
    slug: 'black-widow', title: 'Black Widow', year: 2021, phase: 4, poster: 'bw',
    summary: 'Set after Civil War, Natasha Romanoff confronts her past and the Red Room that made her.',
    characters: ['Natasha Romanoff', 'Yelena Belova', 'Alexei Shostakov', 'Melina Vostokoff'],
    connections: ['Introduces Yelena Belova', 'Leads into Thunderbolts*'],
  },
  {
    slug: 'shang-chi', title: 'Shang-Chi and the Legend of the Ten Rings', year: 2021, phase: 4, poster: 'shangchi',
    summary: 'Shang-Chi is drawn back into the Ten Rings organization led by his father, Wenwu.',
    characters: ['Shang-Chi', 'Katy', 'Wenwu', 'Xialing'],
    connections: ['The real leader of the Ten Rings revealed', 'Ten Rings’ origin remains a mystery'],
  },
  {
    slug: 'eternals', title: 'Eternals', year: 2021, phase: 4, poster: 'eternals',
    summary: 'Immortal beings who have secretly lived on Earth for millennia reunite to face an ancient threat.',
    characters: ['Sersi', 'Ikaris', 'Thena', 'Ajak', 'Kingo'],
    connections: ['The Celestials and the Emergence', 'Introduces Eros (Starfox)'],
  },
  {
    slug: 'spider-man-no-way-home', title: 'Spider-Man: No Way Home', year: 2021, phase: 4, poster: 'nwh',
    summary: 'When a spell to restore Peter Parker’s secret goes wrong, visitors from other universes cross into his world.',
    characters: ['Peter Parker', 'Stephen Strange', 'MJ', 'Ned Leeds'],
    connections: ['The multiverse is cracked open', 'The world forgets Peter Parker'],
  },
  {
    slug: 'doctor-strange-multiverse-of-madness', title: 'Doctor Strange in the Multiverse of Madness', year: 2022, phase: 4, poster: 'mom',
    summary: 'Strange protects America Chavez, a teen who can travel the multiverse, from a powerful threat.',
    characters: ['Stephen Strange', 'Wanda Maximoff', 'America Chavez', 'Wong'],
    connections: ['Visits Earth-838 and its Illuminati', 'Continues Wanda’s arc from WandaVision'],
  },
  {
    slug: 'thor-love-and-thunder', title: 'Thor: Love and Thunder', year: 2022, phase: 4, poster: 'lat',
    summary: 'Thor’s retirement is interrupted by Gorr the God Butcher, and Jane Foster returns wielding Mjolnir.',
    characters: ['Thor', 'Jane Foster', 'Valkyrie', 'Gorr'],
    connections: ['Jane Foster becomes the Mighty Thor', 'Introduces Eternity'],
  },
  {
    slug: 'black-panther-wakanda-forever', title: 'Black Panther: Wakanda Forever', year: 2022, phase: 4, poster: 'wf',
    summary: 'Wakanda mourns King T’Challa while facing Namor and the hidden undersea nation of Talokan.',
    characters: ['Shuri', 'Ramonda', 'Okoye', 'Namor', 'Riri Williams'],
    connections: ['Shuri becomes Black Panther', 'Introduces Talokan and Riri Williams'],
  },

  // ───────────── Phase Five ─────────────
  {
    slug: 'quantumania', title: 'Ant-Man and the Wasp: Quantumania', year: 2023, phase: 5, poster: 'quantumania',
    summary: 'Scott, Hope and their family are pulled into the Quantum Realm, where they encounter Kang the Conqueror.',
    characters: ['Scott Lang', 'Hope van Dyne', 'Cassie Lang', 'Kang'],
    connections: ['Kang’s exile in the Quantum Realm', 'Council of Kangs post-credit'],
  },
  {
    slug: 'guardians-vol-3', title: 'Guardians of the Galaxy Vol. 3', year: 2023, phase: 5, poster: 'gotg3',
    summary: 'The Guardians race to save Rocket’s life and confront the High Evolutionary who created him.',
    characters: ['Rocket', 'Peter Quill', 'Nebula', 'Mantis', 'High Evolutionary'],
    connections: ['Rocket’s origin', 'The team’s final mission together'],
  },
  {
    slug: 'the-marvels', title: 'The Marvels', year: 2023, phase: 5, poster: 'marvels',
    summary: 'Carol Danvers, Monica Rambeau and Kamala Khan find their powers entangled and must work together.',
    characters: ['Carol Danvers', 'Monica Rambeau', 'Kamala Khan', 'Dar-Benn'],
    connections: ['Monica crosses into another universe', 'Kamala begins recruiting young heroes'],
  },
  {
    slug: 'deadpool-and-wolverine', title: 'Deadpool & Wolverine', year: 2024, phase: 5, poster: 'dw',
    summary: 'The TVA recruits Deadpool, who teams up with a reluctant variant of Wolverine to save his universe.',
    characters: ['Wade Wilson', 'Logan', 'Mr. Paradox', 'Cassandra Nova'],
    connections: ['The TVA and the Void', 'Bridges the Fox universe to the MCU'],
  },
  {
    slug: 'captain-america-brave-new-world', title: 'Captain America: Brave New World', year: 2025, phase: 5, poster: 'bnw',
    summary: 'Sam Wilson, now Captain America, is caught in an international incident involving President Thaddeus Ross.',
    characters: ['Sam Wilson', 'Thaddeus Ross', 'Joaquin Torres', 'Samuel Sterns'],
    connections: ['Adamantium from Tiamut (Eternals)', 'Ross becomes the Red Hulk'],
  },
  {
    slug: 'thunderbolts', title: 'Thunderbolts*', year: 2025, phase: 5, poster: 'tb',
    summary: 'A team of antiheroes is drawn into a trap and forced to work together.',
    characters: ['Yelena Belova', 'Bucky Barnes', 'Alexei Shostakov', 'John Walker', 'Bob'],
    connections: ['Follows Black Widow and Hawkeye', 'Valentina Allegra de Fontaine’s schemes'],
  },

  // ───────────── Phase Six ─────────────
  {
    slug: 'fantastic-four-first-steps', title: 'The Fantastic Four: First Steps', year: 2025, phase: 6, poster: 'ff',
    summary: 'In a retro-futuristic 1960s world, Marvel’s First Family faces Galactus and his herald, the Silver Surfer.',
    characters: ['Reed Richards', 'Sue Storm', 'Johnny Storm', 'Ben Grimm', 'Galactus', 'Shalla-Bal'],
    connections: ['Set on Earth-828', 'Opens Phase Six'],
  },
  {
    slug: 'spider-man-brand-new-day', title: 'Spider-Man: Brand New Day', year: 2026, phase: 6, poster: 'bnd',
    summary: 'Peter Parker’s next chapter after the events of No Way Home.',
    characters: ['Peter Parker'],
    connections: ['Follows the world forgetting Peter Parker'],
  },
  {
    slug: 'avengers-doomsday', title: 'Avengers: Doomsday', year: 2026, phase: 6, poster: 'doomsday', status: 'announced',
    summary: 'The next Avengers event film. Details are limited to the studio’s official announcements.',
    characters: ['Victor von Doom'],
    connections: ['Scheduled for December 2026 at time of writing — verify'],
  },
  {
    slug: 'avengers-secret-wars', title: 'Avengers: Secret Wars', year: 2027, phase: 6, poster: '', status: 'announced',
    summary: 'The planned conclusion of the Multiverse Saga. Details are limited to official announcements.',
    characters: [],
    connections: ['Scheduled for December 2027 at time of writing — verify'],
  },
];
