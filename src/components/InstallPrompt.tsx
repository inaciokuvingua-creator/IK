import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('pwa_install_dismissed');
    if (stored) { setDismissed(true); return; }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('pwa_install_dismissed', '1');
  };

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-slide-up">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-2xl shadow-black/50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0">
            <Download size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">Instalar IK Finance</p>
            <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
              Instale o app para acesso rápido, uso offline e experiência nativa.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
              >
                Instalar
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 border border-gray-700 hover:bg-gray-800 text-gray-400 text-xs rounded-lg transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-gray-600 hover:text-gray-400 transition-colors shrink-0">
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
