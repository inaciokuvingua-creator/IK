import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSeasonalConfig, getDailyAnimSet, type SeasonalConfig } from '../lib/seasonalEngine';
import { useProfile } from './ProfileContext';

export type AnimIntensity = 'off' | 'low' | 'medium' | 'high';

export type AnimSettings = {
  enabled: boolean;
  intensity: AnimIntensity;
  seasonalThemes: boolean;
  particles: boolean;
  minimal: boolean;
};

type AnimContextType = {
  settings: AnimSettings;
  seasonal: SeasonalConfig;
  animSet: ReturnType<typeof getDailyAnimSet>;
  updateSettings: (patch: Partial<AnimSettings>) => void;
  entryClass: (delay?: number) => string;
  cardClass: string;
  kpiClass: string;
};

const DEFAULTS: AnimSettings = {
  enabled: true,
  intensity: 'medium',
  seasonalThemes: true,
  particles: true,
  minimal: false,
};

const INTENSITY_SPEED: Record<AnimIntensity, number> = {
  off: 1, low: 1.5, medium: 1, high: 0.7,
};
const INTENSITY_VALUE: Record<AnimIntensity, number> = {
  off: 0, low: 0.5, medium: 1, high: 1.5,
};

const LS_KEY = 'ik_anim_settings';

const Ctx = createContext<AnimContextType | null>(null);

export function AnimationProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile();

  const [settings, setSettings] = useState<AnimSettings>(() => {
    try {
      const s = localStorage.getItem(LS_KEY);
      return s ? { ...DEFAULTS, ...JSON.parse(s) } : DEFAULTS;
    } catch { return DEFAULTS; }
  });

  // Detect country from profile
  const country = profile?.country ?? 'AO';
  const locale  = localStorage.getItem('ik_lang') ?? 'pt';

  const seasonal = getSeasonalConfig(new Date(), country, locale);
  const animSet  = getDailyAnimSet();

  // Apply theme class + CSS variables to document root
  useEffect(() => {
    const root = document.documentElement;

    // Remove all theme classes
    root.classList.forEach(c => { if (c.startsWith('theme-')) root.classList.remove(c); });

    if (settings.enabled && settings.seasonalThemes) {
      root.classList.add(`theme-${seasonal.theme}`);
    } else {
      root.classList.add('theme-default');
    }

    // Speed + intensity variables
    const speed = settings.enabled ? INTENSITY_SPEED[settings.intensity] : 1;
    const intensity = settings.enabled ? INTENSITY_VALUE[settings.intensity] : 0;
    root.style.setProperty('--anim-speed', String(speed));
    root.style.setProperty('--anim-intensity', String(intensity));
  }, [settings, seasonal.theme]);

  const updateSettings = (patch: Partial<AnimSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const entryClass = (delay?: number): string => {
    if (!settings.enabled || settings.minimal) return '';
    const cls = animSet.entry;
    if (delay) return `${cls} anim-delay-${delay}`;
    return cls;
  };

  const cardClass = (!settings.enabled || settings.minimal) ? '' : animSet.card;
  const kpiClass  = (!settings.enabled || settings.minimal) ? '' : animSet.kpi;

  return (
    <Ctx.Provider value={{ settings, seasonal, animSet, updateSettings, entryClass, cardClass, kpiClass }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAnimation() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAnimation must be used within AnimationProvider');
  return ctx;
}
