import { useCallback, useRef, useState } from 'react';

type Entry<T> = { page: T; scroll?: number };

/**
 * Mantém um histórico de navegação (como o do navegador)
 * para que o botão "voltar" regresso à página anterior,
 * não ao dashboard.
 */
export function useNavHistory<T extends string>(initial: T) {
  const [current, setCurrent] = useState<T>(initial);
  // ref para o stack evita re-renders ao manipular e dá acesso síncrono nos handlers
  const pastRef = useRef<Entry<T>[]>([]);
  const futureRef = useRef<Entry<T>[]>([]);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const syncFlags = useCallback(() => {
    setCanGoBack(pastRef.current.length > 0);
    setCanGoForward(futureRef.current.length > 0);
  }, []);

  /** Navega para uma nova página (empurra a atual para o histórico). */
  const navigate = useCallback(
    (next: T) => {
      if (next === current) return;
      const scroll = typeof window !== 'undefined' ? window.scrollY : 0;
      pastRef.current.push({ page: current, scroll });
      futureRef.current = []; // limpa o "avançar" ao navegar novo
      setCurrent(next);
      syncFlags();
      // scroll to top na nova página
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      }
    },
    [current, syncFlags],
  );

  /** Substitui a página atual sem tocar no histórico (ex.: abrir link directo). */
  const replace = useCallback((next: T) => {
    setCurrent(next);
  }, []);

  /** Volta à página anterior, se existir. Devolve true se retrocedeu. */
  const goBack = useCallback((): boolean => {
    if (pastRef.current.length === 0) return false;
    const scroll = typeof window !== 'undefined' ? window.scrollY : 0;
    futureRef.current.push({ page: current, scroll });
    const prev = pastRef.current.pop()!;
    setCurrent(prev.page);
    syncFlags();
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => window.scrollTo({ top: prev.scroll ?? 0, behavior: 'smooth' }));
    }
    return true;
  }, [current, syncFlags]);

  /** Avança para a página seguinte, se existir. Devolve true se avançou. */
  const goForward = useCallback((): boolean => {
    if (futureRef.current.length === 0) return false;
    const scroll = typeof window !== 'undefined' ? window.scrollY : 0;
    pastRef.current.push({ page: current, scroll });
    const next = futureRef.current.pop()!;
    setCurrent(next.page);
    syncFlags();
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => window.scrollTo({ top: next.scroll ?? 0, behavior: 'smooth' }));
    }
    return true;
  }, [current, syncFlags]);

  return {
    current,
    navigate,
    replace,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
  };
}
