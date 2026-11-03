/**
 * Name pools for GENERATED (fictional) players and staff. Names are combined at
 * random; generated people are always tagged `source: 'generated'` and are not
 * intended to represent any real person.
 */
export interface NamePool {
  nationality: string;
  first: string[];
  last: string[];
}

export const NAME_POOLS: NamePool[] = [
  {
    nationality: 'USA',
    first: ['Marcus', 'Jalen', 'Tyrese', 'Caleb', 'Darius', 'Isaiah', 'Malik', 'Brandon', 'Elijah', 'Jordan', 'Devin', 'Trent', 'Andre', 'Cameron', 'Xavier', 'Miles', 'Damon', 'Corey', 'Terrence', 'Austin', 'Grant', 'Reggie', 'Quentin', 'Desmond', 'Nolan'],
    last: ['Whitfield', 'Harmon', 'Brooks', 'Coleman', 'Reed', 'Hayes', 'Dawson', 'Bennett', 'Carver', 'Lawson', 'Pryor', 'Ellison', 'Tatum-Reeves', 'Holloway', 'Mercer', 'Vance', 'Sutton', 'Gaines', 'Whitaker', 'Barrow', 'Kendrick', 'Fulton', 'Drummond-Hale', 'Ashby', 'Prescott'],
  },
  {
    nationality: 'ESP',
    first: ['Alejandro', 'Pablo', 'Sergio', 'Javier', 'Álvaro', 'Diego', 'Marc', 'Iker', 'Rubén', 'Adrián'],
    last: ['Navarro-Ruiz', 'Castellano', 'Belmonte', 'Ortega', 'Varela', 'Montoya', 'Salcedo', 'Ibarra', 'Quintana', 'Robles'],
  },
  {
    nationality: 'GRC',
    first: ['Giorgos', 'Nikos', 'Kostas', 'Dimitris', 'Vasilis', 'Thanasis', 'Panagiotis', 'Stelios', 'Michalis', 'Ilias'],
    last: ['Papadakis', 'Kalogeropoulos', 'Stavridis', 'Mavros', 'Theodorou', 'Karamanlis', 'Zervas', 'Lambrou', 'Vlachos', 'Dimakis'],
  },
  {
    nationality: 'TUR',
    first: ['Emre', 'Burak', 'Cem', 'Kerem', 'Mert', 'Oğuz', 'Serkan', 'Tolga', 'Yiğit', 'Arda'],
    last: ['Yıldırım', 'Kaya', 'Demirtaş', 'Aksoy', 'Erdem', 'Korkmaz', 'Polat', 'Şahinoğlu', 'Tekin', 'Uçar'],
  },
  {
    nationality: 'ISR',
    first: ['Yonatan', 'Omer', 'Itay', 'Noam', 'Ariel', 'Eyal', 'Guy', 'Roi', 'Tomer', 'Yuval'],
    last: ['Ben-Ami', 'Shalev', 'Mizrahi-Tal', 'Golan', 'Peretz', 'Avraham', 'Levinson', 'Dahan', 'Kedem', 'Sasson'],
  },
  {
    nationality: 'ITA',
    first: ['Lorenzo', 'Matteo', 'Alessandro', 'Davide', 'Riccardo', 'Federico', 'Tommaso', 'Nicolò', 'Simone', 'Gabriele'],
    last: ['Ferraresi', 'Conti', 'Galimberti', 'Moretti', 'Bianchetti', 'Rinaldi', 'Sartori', 'Lombardo', 'Vitale', 'Pellegrini'],
  },
  {
    nationality: 'FRA',
    first: ['Théo', 'Hugo', 'Louis', 'Mathis', 'Bastien', 'Killian', 'Nathan', 'Yanis', 'Rémi', 'Clément'],
    last: ['Delacroix', 'Moreau-Petit', 'Lefebvre', 'Garnier', 'Rousseau', 'Fontaine', 'Chevalier', 'Mercier', 'Lambert', 'Girard'],
  },
  {
    nationality: 'DEU',
    first: ['Lukas', 'Jonas', 'Felix', 'Moritz', 'Niklas', 'Tobias', 'Leon', 'Maximilian', 'Paul', 'Jannik'],
    last: ['Hartmann', 'Brandt', 'Kessler', 'Vogel', 'Lindner', 'Schuster', 'Krüger', 'Albrecht', 'Wendt', 'Engel'],
  },
  {
    nationality: 'SRB',
    first: ['Nikola', 'Stefan', 'Luka', 'Marko', 'Aleksa', 'Filip', 'Uroš', 'Dušan', 'Vuk', 'Ognjen'],
    last: ['Jovanović-Lazić', 'Marković', 'Petrović', 'Nikolić', 'Stanković', 'Radović', 'Milošević', 'Pavlović', 'Ilić', 'Kostić'],
  },
  {
    nationality: 'LTU',
    first: ['Mantas', 'Tomas', 'Paulius', 'Rokas', 'Domantas', 'Lukas', 'Ignas', 'Arnas', 'Deividas', 'Gytis'],
    last: ['Kazlauskas', 'Petrauskas', 'Jankūnas', 'Valančius', 'Butkus', 'Žukauskas', 'Rimkus', 'Stankevičius', 'Paulauskas', 'Urbonas'],
  },
  {
    nationality: 'CAN',
    first: ['Liam', 'Ethan', 'Owen', 'Noah', 'Logan', 'Dylan', 'Ryan', 'Connor', 'Jamal', 'Kofi'],
    last: ['McAllister', 'Okafor-Grant', 'Tremblay', 'Fraser', 'Boateng', 'Gagnon', 'Campbell', 'Stewart', 'Lapointe', 'Bouchard'],
  },
  {
    nationality: 'AUS',
    first: ['Jack', 'Lachlan', 'Riley', 'Cooper', 'Mitchell', 'Harrison', 'Jye', 'Bailey', 'Kai', 'Tyson'],
    last: ['Thornton', 'McKinnon', 'Bradshaw', 'Whitlock', 'Kirkwood', 'Pemberton', 'Hollis', 'Ashworth', 'Reardon', 'Dunstan'],
  },
  {
    nationality: 'NGA',
    first: ['Chukwuemeka', 'Obinna', 'Tobi', 'Emeka', 'Ifeanyi', 'Segun', 'Chidi', 'Kelechi', 'Uche', 'Femi'],
    last: ['Okonkwo', 'Adeyemi', 'Nwosu', 'Balogun', 'Eze', 'Okafor', 'Olawale', 'Chukwu', 'Adebayo-Ike', 'Nnamdi'],
  },
];

export const COACH_FIRST = ['Robert', 'Ettore', 'Dimitrios', 'Carlos', 'Ergin', 'Oded', 'Pierre', 'Stefan', 'Mike', 'Andrea', 'Rick', 'Sasha', 'Pedro', 'Jürgen', 'Zoran'];
export const COACH_LAST = ['Halvorsen', 'Marchetti', 'Ioannou', 'Lozano', 'Öztürk', 'Kaplan', 'Duval', 'Reinholt', 'Callahan', 'Rossetti', 'Brennan', 'Đorđević', 'Serrano', 'Weber', 'Tomić'];
