import { useEffect, useMemo, useState } from 'react';
import { Download, Monitor, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  const canPromptInstall = useMemo(() => Boolean(deferredPrompt), [deferredPrompt]);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const stored = localStorage.getItem('pwa_install_dismissed');
    if (stored) setDismissed(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 3000);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setShow(false);
      setDeferredPrompt(null);
      localStorage.removeItem('pwa_install_dismissed');
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setShow(true);
      return;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
      setDismissed(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('pwa_install_dismissed', '1');
  };

  if (installed) return null;

  return (
    <>
      {/* FAB compacto — canto inferior esquerdo, apenas ícone */}
      {!show && (
        <button
          onClick={() => setShow(true)}
          title="Baixar app"
          aria-label="Baixar app"
          className="fixed bottom-4 left-4 z-40 w-11 h-11 flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-lg shadow-emerald-900/40 transition-colors animate-slide-up"
        >
          <Download size={18} />
        </button>
      )}

      {/* Painel expandido — canto inferior esquerdo, não cobre conteúdo à direita */}
      {show && (!dismissed || true) && (
        <div className="fixed bottom-4 left-4 z-50 w-72 max-w-[calc(100vw-2rem)] animate-slide-up">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-2xl shadow-black/50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                <Download size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">Instalar IK Finance</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  Instale no Android e computador com sincronização da mesma conta, dados e experiência integrada.
                </p>

                <div className="mt-3 space-y-2 text-xs text-gray-300">
                  <p className="flex items-center gap-2"><Smartphone size={13} className="text-emerald-400" /> Android: toque em <strong>Instalar</strong> quando disponível.</p>
                  <p className="flex items-center gap-2"><Monitor size={13} className="text-emerald-400" /> Computador: menu do navegador {'>'} Instalar aplicativo.</p>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleInstall}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                  >
                    {canPromptInstall ? 'Instalar agora' : 'Ver instruções'}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 border border-gray-700 hover:bg-gray-800 text-gray-400 text-xs rounded-lg transition-colors"
                  >
                    Agora não
                  </button>
                </div>
              </div>
              <button onClick={() => setShow(false)} className="text-gray-600 hover:text-gray-400 transition-colors shrink-0" aria-label="Fechar">
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
