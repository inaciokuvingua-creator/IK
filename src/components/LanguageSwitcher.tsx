import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown, Search } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type LangCode, changeLang } from '../i18n';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Props = {
  variant?: 'sidebar' | 'compact' | 'full' | 'settings';
};

export default function LanguageSwitcher({ variant = 'compact' }: Props) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const current = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  const filtered = SUPPORTED_LANGUAGES.filter(l =>
    l.nativeName.toLowerCase().includes(query.toLowerCase()) ||
    l.name.toLowerCase().includes(query.toLowerCase()) ||
    l.code.includes(query.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = async (code: LangCode) => {
    changeLang(code);
    setOpen(false);
    setQuery('');
    // Persist to Supabase profile (use user_id, not id)
    if (user) {
      await supabase.from('user_profiles').update({ idioma: code }).eq('user_id', user.id);
    }
  };

  if (variant === 'settings') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SUPPORTED_LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => select(lang.code)}
            className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${
              i18n.language === lang.code
                ? 'bg-emerald-950/40 border-emerald-700 text-white'
                : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'
            }`}
          >
            <span className="text-2xl shrink-0">{lang.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{lang.nativeName}</p>
              <p className="text-xs text-gray-600 truncate">{lang.name}</p>
            </div>
            {i18n.language === lang.code && (
              <Check size={14} className="text-emerald-400 shrink-0" />
            )}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm"
        >
          <Globe size={15} className="shrink-0" />
          <span className="flex items-center gap-1.5 flex-1 text-xs">
            <span>{current.flag}</span>
            <span className="font-medium">{current.nativeName}</span>
          </span>
          <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50">
            <div className="p-2 border-b border-gray-800">
              <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
                <Search size={12} className="text-gray-500 shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="bg-transparent text-white text-xs flex-1 focus:outline-none placeholder-gray-600"
                  placeholder="Buscar idioma..."
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto py-1">
              {filtered.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => select(lang.code)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    i18n.language === lang.code
                      ? 'bg-emerald-950/40 text-emerald-300'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span className="flex-1 text-xs font-medium">{lang.nativeName}</span>
                  {i18n.language === lang.code && <Check size={11} className="text-emerald-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 bg-gray-800/60 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 px-4 py-2.5 rounded-xl transition-colors"
        >
          <span className="text-base">{current.flag}</span>
          <span className="text-white text-sm font-medium">{current.nativeName}</span>
          <ChevronDown size={14} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute top-full mt-2 right-0 w-64 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50">
            <div className="p-3 border-b border-gray-800">
              <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
                <Search size={13} className="text-gray-500 shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="bg-transparent text-white text-sm flex-1 focus:outline-none placeholder-gray-600"
                  placeholder="Search language..."
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto py-1.5">
              {filtered.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => select(lang.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                    i18n.language === lang.code
                      ? 'bg-emerald-950/40 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="text-xl shrink-0">{lang.flag}</span>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium leading-tight">{lang.nativeName}</p>
                    <p className="text-xs text-gray-600 leading-tight">{lang.name}</p>
                  </div>
                  {i18n.language === lang.code && <Check size={13} className="text-emerald-400 shrink-0" />}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-gray-600 text-sm py-4">...</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // compact (default) — icon button
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-gray-800"
        title={current.nativeName}
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="text-xs font-medium hidden sm:block">{current.code.toUpperCase()}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 right-0 w-52 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="p-2 border-b border-gray-800">
            <div className="flex items-center gap-1.5 bg-gray-800 rounded-xl px-2.5 py-1.5">
              <Search size={11} className="text-gray-500 shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="bg-transparent text-white text-xs flex-1 focus:outline-none placeholder-gray-600"
                placeholder="..."
                autoFocus
              />
            </div>
          </div>
          <div className="py-1 max-h-60 overflow-y-auto">
            {filtered.map(lang => (
              <button
                key={lang.code}
                onClick={() => select(lang.code)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  i18n.language === lang.code
                    ? 'bg-emerald-950/40 text-emerald-300'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span className="flex-1 text-xs">{lang.nativeName}</span>
                {i18n.language === lang.code && <Check size={10} className="text-emerald-400" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
