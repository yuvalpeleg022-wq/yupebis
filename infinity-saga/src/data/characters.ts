export interface Character {
  id: string;
  name: string;
  alias: string;
  /** Key into the portrait manifest (src/config/assets.ts). */
  portrait: string;
  palette: [string, string];
  line: string;
  bio: string;
  films: string[];
}

export const CHARACTERS: Character[] = [
  {
    id: 'iron-man', name: 'Iron Man', alias: 'Tony Stark', portrait: 'iron-man', palette: ['#c8102e', '#e8b04b'],
    line: 'Genius. Engineer. The man who started it all.',
    bio: 'Inventor and industrialist who built his first armor in a cave, founded the Avengers alongside Nick Fury and, in the end, made the final snap.',
    films: ['Iron Man', 'The Avengers', 'Captain America: Civil War', 'Avengers: Endgame'],
  },
  {
    id: 'captain-america', name: 'Captain America', alias: 'Steve Rogers', portrait: 'captain-america', palette: ['#1d3c8f', '#c8102e'],
    line: 'A soldier out of time who never stopped standing up.',
    bio: 'The first super-soldier, frozen for decades and revived to lead the Avengers. He returned the stones and chose a life with Peggy Carter.',
    films: ['Captain America: The First Avenger', 'The Winter Soldier', 'Civil War', 'Avengers: Endgame'],
  },
  {
    id: 'thor', name: 'Thor', alias: 'Thor Odinson', portrait: 'thor', palette: ['#2f7bff', '#9bb8ff'],
    line: 'God of Thunder. King without a throne.',
    bio: 'Asgardian prince who lost his home, his family and his hammer — and forged Stormbreaker in the heart of a dying star.',
    films: ['Thor', 'Thor: Ragnarok', 'Avengers: Infinity War', 'Thor: Love and Thunder'],
  },
  {
    id: 'doctor-strange', name: 'Doctor Strange', alias: 'Stephen Strange', portrait: 'doctor-strange', palette: ['#22e58a', '#c8102e'],
    line: 'He searched millions of futures for a single way to win.',
    bio: 'Former neurosurgeon turned Sorcerer Supreme, keeper of the Time Stone and guardian against threats from other dimensions.',
    films: ['Doctor Strange', 'Avengers: Infinity War', 'No Way Home', 'Multiverse of Madness'],
  },
  {
    id: 'spider-man', name: 'Spider-Man', alias: 'Peter Parker', portrait: 'spider-man', palette: ['#c8102e', '#1d3c8f'],
    line: 'Friendly neighborhood hero, forgotten by the world he saved.',
    bio: 'A teenager from Queens mentored by Tony Stark, who gave up everyone’s memory of him to repair the multiverse.',
    films: ['Spider-Man: Homecoming', 'Far From Home', 'No Way Home'],
  },
  {
    id: 'scarlet-witch', name: 'Scarlet Witch', alias: 'Wanda Maximoff', portrait: 'scarlet-witch', palette: ['#ff2a3d', '#5a0010'],
    line: 'Grief, given limitless power.',
    bio: 'Empowered by the Mind Stone, she fought beside the Avengers before embracing the chaos magic of the Scarlet Witch.',
    films: ['Age of Ultron', 'Civil War', 'Infinity War', 'Multiverse of Madness'],
  },
  {
    id: 'loki', name: 'Loki', alias: 'God of Mischief', portrait: 'loki', palette: ['#1f8a4c', '#e8b04b'],
    line: 'From villain to the god who holds the timeline together.',
    bio: 'Adopted son of Odin who led the Chitauri invasion, then — as a variant — sat upon the throne at the end of time to hold the branches together.',
    films: ['Thor', 'The Avengers', 'Thor: Ragnarok', 'Loki (series)'],
  },
  {
    id: 'thanos', name: 'Thanos', alias: 'The Mad Titan', portrait: 'thanos', palette: ['#a43bff', '#e8b04b'],
    line: 'He believed balance required sacrifice.',
    bio: 'Titan warlord who gathered all six Infinity Stones and erased half of all life — then was undone by the Avengers.',
    films: ['The Avengers', 'Guardians of the Galaxy', 'Infinity War', 'Endgame'],
  },
  {
    id: 'black-panther', name: 'Black Panther', alias: 'T’Challa', portrait: 'black-panther', palette: ['#6b3bff', '#c0c0d0'],
    line: 'King of Wakanda. Protector of its people.',
    bio: 'The king who opened Wakanda to the world and fought Thanos’s army on its borders. The mantle later passed to Shuri.',
    films: ['Captain America: Civil War', 'Black Panther', 'Infinity War', 'Endgame'],
  },
  {
    id: 'captain-marvel', name: 'Captain Marvel', alias: 'Carol Danvers', portrait: 'captain-marvel', palette: ['#1d3c8f', '#e8b04b'],
    line: 'Powered by the Tesseract’s energy. Higher, further, faster.',
    bio: 'Air Force pilot turned cosmic powerhouse, whose powers came from the Space Stone’s energy.',
    films: ['Captain Marvel', 'Avengers: Endgame', 'The Marvels'],
  },
];
