// Seasonal theme detection engine
// Determines current season/holiday based on date, user country & language

export type ThemeId =
  | 'default' | 'newyear' | 'valentine' | 'carnival' | 'easter'
  | 'spring' | 'summer' | 'autumn' | 'winter'
  | 'halloween' | 'christmas' | 'angola' | 'china_newyear';

export type ParticleType = 'none' | 'snow' | 'confetti' | 'petals' | 'leaves' | 'hearts' | 'fireworks' | 'stars';

export type SeasonalConfig = {
  theme: ThemeId;
  particle: ParticleType;
  particleCount: number;
  label: string;
  icon: string;
};

// Get hemisphere from country code (Southern Hemisphere countries)
const SOUTHERN = new Set(['AO','ZA','MZ','ZW','BW','NA','LS','SZ','BR','AR','CL','PE','UY','AU','NZ']);

function getSeason(month: number, isSouthern: boolean): 'spring' | 'summer' | 'autumn' | 'winter' {
  const m = isSouthern ? (month + 6) % 12 : month;
  if (m >= 2 && m <= 4)  return 'spring';
  if (m >= 5 && m <= 7)  return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

export function getSeasonalConfig(
  date: Date = new Date(),
  countryCode = 'AO',
  locale = 'pt'
): SeasonalConfig {
  const month  = date.getMonth();     // 0-11
  const day    = date.getDate();
  const isSouth = SOUTHERN.has(countryCode.toUpperCase());

  // ── Priority: exact holiday windows ──────────────────────────────────────

  // New Year (Dec 31 – Jan 3)
  if ((month === 11 && day >= 31) || (month === 0 && day <= 3)) {
    return { theme: 'newyear', particle: 'fireworks', particleCount: 20, label: "Happy New Year", icon: "🎆" };
  }

  // Chinese New Year (late Jan / early Feb — simplified: Jan 22–Feb 5)
  if (locale === 'zh' && ((month === 0 && day >= 22) || (month === 1 && day <= 5))) {
    return { theme: 'newyear', particle: 'fireworks', particleCount: 25, label: "新年快乐", icon: "🧧" };
  }

  // Christmas (Dec 20 – Dec 30)
  if (month === 11 && day >= 20 && day <= 30) {
    return { theme: 'christmas', particle: 'snow', particleCount: 30, label: "Feliz Natal", icon: "🎄" };
  }

  // Valentine's Day (Feb 12–15)
  if (month === 1 && day >= 12 && day <= 15) {
    return { theme: 'valentine', particle: 'hearts', particleCount: 15, label: "Dia dos Namorados", icon: "❤️" };
  }

  // Carnival — Mardi Gras (approx Feb/Mar — simplified: Feb 16–28)
  if (month === 1 && day >= 16 && day <= 28) {
    return { theme: 'carnival', particle: 'confetti', particleCount: 40, label: "Carnaval", icon: "🎭" };
  }

  // Easter (March/April — simplified: last week of March + first 2 weeks April)
  if ((month === 2 && day >= 24) || (month === 3 && day <= 14)) {
    return { theme: 'easter', particle: 'confetti', particleCount: 20, label: "Feliz Páscoa", icon: "🐣" };
  }

  // Halloween (Oct 28–31)
  if (month === 9 && day >= 28) {
    return { theme: 'halloween', particle: 'none', particleCount: 0, label: "Halloween", icon: "🎃" };
  }

  // Angola Independence Day (Nov 11)
  if (countryCode === 'AO' && month === 10 && day >= 9 && day <= 12) {
    return { theme: 'angola', particle: 'confetti', particleCount: 30, label: "Independência de Angola", icon: "🇦🇴" };
  }

  // ── Season fallback ───────────────────────────────────────────────────────
  const season = getSeason(month, isSouth);
  const seasonMap: Record<typeof season, SeasonalConfig> = {
    spring: { theme: 'spring', particle: 'petals',  particleCount: 20, label: "Primavera",  icon: "🌸" },
    summer: { theme: 'summer', particle: 'none',    particleCount: 0,  label: "Verão",       icon: "☀️" },
    autumn: { theme: 'autumn', particle: 'leaves',  particleCount: 18, label: "Outono",      icon: "🍂" },
    winter: { theme: 'winter', particle: 'snow',    particleCount: 25, label: "Inverno",     icon: "❄️" },
  };
  return seasonMap[season];
}

// ── Daily animation rotation ──────────────────────────────────────────────────
// Returns a consistent-but-varied style seed for the day
const ANIM_SETS = [
  { entry: 'anim-slide-up',    card: 'hover-lift',  kpi: 'anim-scale-in' },
  { entry: 'anim-scale-up',    card: 'hover-scale', kpi: 'anim-slide-up' },
  { entry: 'anim-fade-in',     card: 'hover-lift',  kpi: 'anim-zoom-in' },
  { entry: 'anim-slide-left',  card: 'hover-scale', kpi: 'anim-scale-in' },
  { entry: 'anim-zoom-in',     card: 'hover-lift',  kpi: 'anim-bounce-in' },
  { entry: 'anim-bounce-in',   card: 'hover-scale', kpi: 'anim-slide-up' },
  { entry: 'anim-flip-in',     card: 'hover-lift',  kpi: 'anim-scale-up' },
];

export function getDailyAnimSet() {
  const d = new Date();
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(),0,0).getTime()) / 86400000);
  return ANIM_SETS[dayOfYear % ANIM_SETS.length];
}
