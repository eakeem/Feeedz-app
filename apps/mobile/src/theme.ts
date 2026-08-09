export const colors = {
  bg: '#050505',
  panel: '#111111',
  panel2: '#181818',
  border: '#242424',
  text: '#f0f0f0',
  muted: '#888888',
  dim: '#4a4a4a',
  accent: '#00ff88',
  gold: '#ffd700',
  magenta: '#ff006e',
  cyan: '#00b4d8',
  orange: '#ff6b35'
};

export const genres = [
  { name: 'Dancehall', color: colors.accent },
  { name: 'Reggae', color: colors.gold },
  { name: 'Party', color: colors.magenta },
  { name: 'Concert', color: colors.cyan },
  { name: 'Soca', color: colors.orange },
  { name: 'Afrobeat', color: '#a855f7' },
  { name: 'Comedy', color: '#f472b6' },
  { name: 'Cultural', color: '#34d399' }
] as const;

export const parishes = [
  'Kingston', 'St. Andrew', 'St. Catherine', 'Manchester', 'St. James', 'Westmoreland', 'St. Ann',
  'St. Mary', 'Portland', 'St. Thomas', 'St. Elizabeth', 'Hanover', 'Trelawny', 'Clarendon'
];

export function genreColor(genre: string) {
  return genres.find((item) => item.name === genre)?.color ?? colors.accent;
}