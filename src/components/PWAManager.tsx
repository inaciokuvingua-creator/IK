import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PWAManager() {
  const [offline, setOffline] = useState(!navigator.onLine);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) console.log('[PWA] Service worker registered');
    },
    onRegisterError(error) {
      console.error('[PWA] SW registration error', error);
    },
  });

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <>
      {/* Offline banner */}
      {offline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-900/90 border-b border-amber-700 backdrop-blur-sm px-4 py-2 flex items-center justify-center gap-2">
          <WifiOff size={14} className="text-amber-300 shrink-0" />
          <p className="text-amber-200 text-xs font-medium">Sem conexão — exibindo dados em cache</p>
        </div>
      )}

      {/* SW update toast */}
      {needRefresh && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-72 z-50">
          <div className="bg-gray-900 border border-emerald-800 rounded-2xl p-4 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-3">
              <RefreshCw size={16} className="text-emerald-400 shrink-0" />
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Nova versão disponível</p>
                <p className="text-gray-400 text-xs">Atualize para obter as últimas melhorias.</p>
              </div>
              <button
                onClick={() => updateServiceWorker(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
