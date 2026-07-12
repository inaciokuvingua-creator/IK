import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type CurrencyCode = 'AOA' | 'USD' | 'EUR' | 'GBP' | 'BRL' | 'CNY' | 'ZAR';
 
export type CurrencyInfo = {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
};

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'AOA', symbol: 'Kz',  name: 'Kwanza Angolano', flag: '🇦🇴' },
  { code: 'USD', symbol: '$',   name: 'Dólar Americano', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€',   name: 'Euro',            flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',   name: 'Libra Esterlina', flag: '🇬🇧' },
  { code: 'BRL', symbol: 'R$',  name: 'Real Brasileiro', flag: '🇧🇷' },
  { code: 'CNY', symbol: '¥',   name: 'Yuan Chinês',     flag: '🇨🇳' },
  { code: 'ZAR', symbol: 'R',   name: 'Rand Sul-Afric.', flag: '🇿🇦' },
];

const VALID_CODES = CURRENCIES.map(c => c.code);

type CurrencyContextType = {
  currency: CurrencyInfo;
  setCurrencyCode: (code: CurrencyCode) => void;
  convert: (amountInAOA: number) => number;
  format: (amountInAOA: number) => string;
  rates: Record<string, number> | null;
  ratesLoading: boolean;
  lastUpdated: Date | null;
};

const CurrencyContext = createContext<CurrencyContextType | null>(null);

const LS_KEY = 'ik_currency';

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currencyCode, setCurrencyCodeState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem(LS_KEY);
    return (saved as CurrencyCode) ?? 'AOA';
  });
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load preferred currency from Supabase when user logs in
  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_profiles')
      .select('meta')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const saved = (data?.meta as Record<string, string> | null)?.preferred_currency;
        if (saved && VALID_CODES.includes(saved as CurrencyCode)) {
          setCurrencyCodeState(saved as CurrencyCode);
          localStorage.setItem(LS_KEY, saved);
        }
      });
  }, [user]);

  useEffect(() => {
    // Fetch rates with AOA as base using open.er-api.com (free, no key needed)
    fetch('https://open.er-api.com/v6/latest/AOA')
      .then((r) => r.json())
      .then((data) => {
        if (data?.rates) {
          setRates(data.rates);
          setLastUpdated(new Date());
        }
        setRatesLoading(false);
      })
      .catch(() => {
        // Fallback approximate rates if API fails
        setRates({
          AOA: 1,
          USD: 0.00109,
          EUR: 0.00101,
          GBP: 0.00086,
          BRL: 0.00622,
          CNY: 0.00793,
          ZAR: 0.02030,
        });
        setRatesLoading(false);
      });
  }, []);

  const setCurrencyCode = (code: CurrencyCode) => {
    setCurrencyCodeState(code);
    localStorage.setItem(LS_KEY, code);
    // Persist to Supabase meta field
    if (user) {
      supabase
        .from('user_profiles')
        .select('meta')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          const currentMeta = (data?.meta as Record<string, unknown>) ?? {};
          supabase
            .from('user_profiles')
            .update({ meta: { ...currentMeta, preferred_currency: code } })
            .eq('user_id', user.id);
        });
    }
  };

  const currency = CURRENCIES.find((c) => c.code === currencyCode) ?? CURRENCIES[0];

  const convert = (amountInAOA: number): number => {
    if (!rates || currencyCode === 'AOA') return amountInAOA;
    return amountInAOA * (rates[currencyCode] ?? 1);
  };

  const format = (amountInAOA: number): string => {
    const converted = convert(amountInAOA);
    const formatted = new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
    return `${currency.symbol} ${formatted}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrencyCode, convert, format, rates, ratesLoading, lastUpdated }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
