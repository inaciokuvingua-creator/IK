import { useTranslation } from 'react-i18next';
import { Sparkles, Zap, Leaf, Eye, EyeOff, RotateCcw, Snowflake, Sun, Wind, Moon } from 'lucide-react';
import { useAnimation, type AnimIntensity } from '../context/AnimationContext';

export default function AnimationSettings() {
  const { t } = useTranslation();
  const { settings, seasonal, updateSettings } = useAnimation();

  const intensities: { id: AnimIntensity; label: string; icon: React.ElementType }[] = [
    { id: 'off',    label: t('anim.intensityOff',    { defaultValue: 'Desligado' }),  icon: EyeOff },
    { id: 'low',    label: t('anim.intensityLow',    { defaultValue: 'Baixa' }),      icon: Moon },
    { id: 'medium', label: t('anim.intensityMedium', { defaultValue: 'Média' }),      icon: Sun },
    { id: 'high',   label: t('anim.intensityHigh',   { defaultValue: 'Alta' }),       icon: Zap },
  ];

  const toggles: { key: keyof typeof settings; icon: React.ElementType; label: string; desc: string }[] = [
    {
      key: 'enabled',
      icon: Sparkles,
      label: t('anim.enableAnims', { defaultValue: 'Animações' }),
      desc: t('anim.enableAnimsDesc', { defaultValue: 'Ativar todas as animações e microinterações' }),
    },
    {
      key: 'seasonalThemes',
      icon: Leaf,
      label: t('anim.seasonalThemes', { defaultValue: 'Temas Sazonais' }),
      desc: t('anim.seasonalThemesDesc', { defaultValue: 'Cores e decorações adaptadas à época do ano' }),
    },
    {
      key: 'particles',
      icon: Snowflake,
      label: t('anim.particles', { defaultValue: 'Partículas' }),
      desc: t('anim.particlesDesc', { defaultValue: 'Neve, pétalas, confetes e outros efeitos visuais' }),
    },
    {
      key: 'minimal',
      icon: Wind,
      label: t('anim.minimal', { defaultValue: 'Modo Minimalista' }),
      desc: t('anim.minimalDesc', { defaultValue: 'Remove animações de entrada, mantém apenas transições suaves' }),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header + current theme badge */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-400" />
            {t('anim.title', { defaultValue: 'Animações & Tema Visual' })}
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            {t('anim.subtitle', { defaultValue: 'Personalize as animações e os temas sazonais da plataforma' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded-xl px-3 py-2">
          <span className="text-base">{seasonal.icon}</span>
          <span className="text-gray-300 text-xs font-medium">{seasonal.label}</span>
        </div>
      </div>

      {/* Intensity selector */}
      <div>
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">
          {t('anim.intensityLabel', { defaultValue: 'Intensidade das Animações' })}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {intensities.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => updateSettings({ intensity: id })}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-xs font-medium transition-all ${
                settings.intensity === id
                  ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
                  : 'bg-gray-800/40 border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">
          {t('anim.options', { defaultValue: 'Opções' })}
        </p>
        {toggles.map(({ key, icon: Icon, label, desc }) => {
          const isBoolean = typeof settings[key] === 'boolean';
          if (!isBoolean) return null;
          const val = settings[key] as boolean;
          const disabled = key !== 'enabled' && !settings.enabled;
          return (
            <div key={key} className={`flex items-start gap-4 p-4 bg-gray-800/40 border border-gray-700/50 rounded-2xl transition-opacity ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${val ? 'bg-emerald-950/60' : 'bg-gray-700/50'}`}>
                <Icon size={16} className={val ? 'text-emerald-400' : 'text-gray-500'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
              <div
                role="switch"
                aria-checked={val}
                tabIndex={0}
                onClick={() => updateSettings({ [key]: !val })}
                onKeyDown={e => e.key === 'Enter' && updateSettings({ [key]: !val })}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 mt-0.5 ${val ? 'bg-emerald-500' : 'bg-gray-700'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${val ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Seasonal preview */}
      {settings.seasonalThemes && settings.enabled && (
        <div className="p-4 rounded-2xl border border-gray-700 bg-gray-800/30">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">
            {t('anim.currentSeason', { defaultValue: 'Época Atual' })}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{seasonal.icon}</span>
            <div>
              <p className="text-white text-sm font-semibold">{seasonal.label}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {t('anim.autoChange', { defaultValue: 'Muda automaticamente com o calendário' })}
              </p>
            </div>
          </div>
          {/* Colour preview */}
          <div className="flex gap-2 mt-3">
            {['--season-primary','--season-secondary','--season-accent'].map((v, i) => (
              <div key={i} className="w-8 h-8 rounded-xl border border-gray-700" style={{ background: `var(${v})` }} />
            ))}
            <p className="text-xs text-gray-600 self-center ml-1">
              {t('anim.colorPalette', { defaultValue: 'Paleta da época' })}
            </p>
          </div>
        </div>
      )}

      {/* Reset */}
      <button
        onClick={() => updateSettings({ enabled: true, intensity: 'medium', seasonalThemes: true, particles: true, minimal: false })}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        <RotateCcw size={13} />
        {t('anim.restore', { defaultValue: 'Restaurar padrão' })}
      </button>
    </div>
  );
}
