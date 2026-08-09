export type EventItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  parish: string;
  address: string;
  latitude: number;
  longitude: number;
  genre: string;
  priceJmd: number;
  ticketUrl?: string;
  coverUrl: string;
  posters: string[];
  gallery: string[];
  livePhotos: string[];
  likeCount: number;
  promoter: { id: string; name: string; avatarUrl: string };
};

export const demoEvents: EventItem[] = [
  {
    id: 'stadium-supreme',
    title: 'Stadium Supreme',
    description: 'The biggest dancehall event of the year returns to National Stadium with an all-star lineup, sound system clashes, and a midnight headline set.',
    date: '2026-08-08',
    startTime: '22:00',
    endTime: '06:00',
    venue: 'National Stadium',
    parish: 'Kingston',
    address: 'Independence Park, Kingston 5',
    latitude: 18.0179,
    longitude: -76.8099,
    genre: 'Dancehall',
    priceJmd: 3500,
    ticketUrl: 'https://example.com/tickets/stadium-supreme',
    coverUrl: 'https://picsum.photos/seed/stadium1/900/700',
    posters: ['https://picsum.photos/seed/poster-st1/600/900', 'https://picsum.photos/seed/poster-st2/600/900', 'https://picsum.photos/seed/poster-st3/600/900'],
    gallery: ['https://picsum.photos/seed/st1/500/500', 'https://picsum.photos/seed/st2/500/500', 'https://picsum.photos/seed/st3/500/500'],
    livePhotos: ['https://picsum.photos/seed/live1/500/500', 'https://picsum.photos/seed/live2/500/500', 'https://picsum.photos/seed/live3/500/500'],
    likeCount: 342,
    promoter: { id: 'supreme', name: 'Supreme Entertainment', avatarUrl: 'https://picsum.photos/seed/promo1/100/100' }
  },
  {
    id: 'rebel-salute',
    title: 'Rebel Salute 2026',
    description: 'Jamaica roots reggae festival with three stages, ital food village, craft market, and wellness zone.',
    date: '2026-08-15',
    startTime: '16:00',
    endTime: '02:00',
    venue: "Grizzly's Plantation Cove",
    parish: 'St. Ann',
    address: 'Priory, St. Ann',
    latitude: 18.4167,
    longitude: -77.0833,
    genre: 'Reggae',
    priceJmd: 5000,
    ticketUrl: 'https://example.com/tickets/rebel-salute',
    coverUrl: 'https://picsum.photos/seed/rebel1/900/700',
    posters: ['https://picsum.photos/seed/poster-rb1/600/900', 'https://picsum.photos/seed/poster-rb2/600/900'],
    gallery: ['https://picsum.photos/seed/rb1/500/500', 'https://picsum.photos/seed/rb2/500/500'],
    livePhotos: [],
    likeCount: 518,
    promoter: { id: 'rebel', name: 'Rebel Salute Prod.', avatarUrl: 'https://picsum.photos/seed/promo2/100/100' }
  },
  {
    id: 'negril-beach-bash',
    title: 'Negril Beach Bash',
    description: 'Sunset to sunrise beach party with multiple DJ stages, fire dancers, and VIP cabanas.',
    date: '2026-08-16',
    startTime: '18:00',
    endTime: '06:00',
    venue: 'Doctors Cave Beach Club',
    parish: 'Westmoreland',
    address: 'Norman Manley Blvd, Negril',
    latitude: 18.2733,
    longitude: -78.3383,
    genre: 'Party',
    priceJmd: 2500,
    coverUrl: 'https://picsum.photos/seed/negril1/900/700',
    posters: ['https://picsum.photos/seed/poster-ng1/600/900'],
    gallery: ['https://picsum.photos/seed/ng1/500/500', 'https://picsum.photos/seed/ng2/500/500'],
    livePhotos: [],
    likeCount: 276,
    promoter: { id: 'island-vibes', name: 'Island Vibes', avatarUrl: 'https://picsum.photos/seed/promo3/100/100' }
  },
  {
    id: 'dancehall-wednesdays',
    title: 'Dancehall Wednesdays',
    description: 'The midweek dancehall fix. Weekly party with resident DJs and surprise guests. Half-price drinks before midnight.',
    date: '2026-08-12',
    startTime: '21:00',
    endTime: '03:00',
    venue: 'QUAD Nightclub',
    parish: 'Kingston',
    address: 'Trafalgar Rd, New Kingston',
    latitude: 18.0128,
    longitude: -76.7894,
    genre: 'Dancehall',
    priceJmd: 1500,
    coverUrl: 'https://picsum.photos/seed/quad1/900/700',
    posters: ['https://picsum.photos/seed/poster-qd1/600/900', 'https://picsum.photos/seed/poster-qd2/600/900'],
    gallery: ['https://picsum.photos/seed/qd1/500/500'],
    livePhotos: [],
    likeCount: 189,
    promoter: { id: 'quad', name: 'QUAD Entertainment', avatarUrl: 'https://picsum.photos/seed/promo4/100/100' }
  },
  {
    id: 'sumfest-after-party',
    title: 'Reggae Sumfest After Party',
    description: 'The official after-party for Reggae Sumfest with exclusive performances from festival headliners.',
    date: '2026-08-20',
    startTime: '23:00',
    endTime: '05:00',
    venue: 'Pier 1',
    parish: 'St. James',
    address: 'Marine Park, Montego Bay',
    latitude: 18.4717,
    longitude: -77.9208,
    genre: 'Concert',
    priceJmd: 4000,
    coverUrl: 'https://picsum.photos/seed/sumfest1/900/700',
    posters: ['https://picsum.photos/seed/poster-sf1/600/900', 'https://picsum.photos/seed/poster-sf2/600/900', 'https://picsum.photos/seed/poster-sf3/600/900'],
    gallery: ['https://picsum.photos/seed/sf1/500/500', 'https://picsum.photos/seed/sf2/500/500'],
    livePhotos: [],
    likeCount: 431,
    promoter: { id: 'sumfest', name: 'Sumfest Productions', avatarUrl: 'https://picsum.photos/seed/promo5/100/100' }
  },
  {
    id: 'afrobeats-vibes',
    title: 'Afrobeats & Vibes',
    description: "Kingston's premier Afrobeats night. Afrobeats, Amapiano, and fusion sounds with top selectors.",
    date: '2026-08-22',
    startTime: '20:00',
    endTime: '04:00',
    venue: 'Coke Studio',
    parish: 'St. Andrew',
    address: 'Ardenne Rd, Kingston 10',
    latitude: 18.0211,
    longitude: -76.7678,
    genre: 'Afrobeat',
    priceJmd: 2000,
    coverUrl: 'https://picsum.photos/seed/afro1/900/700',
    posters: ['https://picsum.photos/seed/poster-af1/600/900'],
    gallery: ['https://picsum.photos/seed/af1/500/500'],
    livePhotos: [],
    likeCount: 154,
    promoter: { id: 'vibe', name: 'Vibe Agency', avatarUrl: 'https://picsum.photos/seed/promo6/100/100' }
  },
  {
    id: 'soca-monarch',
    title: 'Soca Monarch Finals',
    description: 'The ultimate Soca competition. Ten artists battle for the crown with original Soca anthems.',
    date: '2026-08-29',
    startTime: '20:00',
    endTime: '03:00',
    venue: 'Montego Bay Convention Centre',
    parish: 'St. James',
    address: 'Rose Hall, Montego Bay',
    latitude: 18.49,
    longitude: -77.94,
    genre: 'Soca',
    priceJmd: 3000,
    coverUrl: 'https://picsum.photos/seed/soca1/900/700',
    posters: ['https://picsum.photos/seed/poster-sc1/600/900', 'https://picsum.photos/seed/poster-sc2/600/900'],
    gallery: ['https://picsum.photos/seed/sc1/500/500'],
    livePhotos: [],
    likeCount: 298,
    promoter: { id: 'carnival', name: 'Carnival Jamaica', avatarUrl: 'https://picsum.photos/seed/promo7/100/100' }
  },
  {
    id: 'sunset-sessions',
    title: 'Sunset Sessions',
    description: "Live reggae and acoustic sets every Friday at Rick's Cafe. Watch the cliff divers and enjoy the sunset.",
    date: '2026-08-14',
    startTime: '17:00',
    endTime: '23:00',
    venue: "Rick's Cafe",
    parish: 'Westmoreland',
    address: 'West End Rd, Negril',
    latitude: 18.27,
    longitude: -78.36,
    genre: 'Reggae',
    priceJmd: 1800,
    coverUrl: 'https://picsum.photos/seed/ricks1/900/700',
    posters: ['https://picsum.photos/seed/poster-rk1/600/900'],
    gallery: ['https://picsum.photos/seed/rk1/500/500', 'https://picsum.photos/seed/rk2/500/500'],
    livePhotos: [],
    likeCount: 223,
    promoter: { id: 'ricks', name: "Rick's Cafe", avatarUrl: 'https://picsum.photos/seed/promo8/100/100' }
  }
];