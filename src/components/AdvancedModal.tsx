import { type CSSProperties, type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Square, X } from 'lucide-react';

type AdvancedModalProps = {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  initialWidth?: number;
  initialHeight?: number;
};

type WindowState = { x: number; y: number; width: number; height: number };
const EDGE = 16;

function fitToViewport(state: WindowState): WindowState {
  const maxWidth = Math.max(280, window.innerWidth - EDGE * 2);
  const maxHeight = Math.max(220, window.innerHeight - EDGE * 2);
  const width = Math.min(state.width, maxWidth);
  const height = Math.min(state.height, maxHeight);
  return {
    width,
    height,
    x: Math.min(Math.max(EDGE, state.x), Math.max(EDGE, window.innerWidth - width - EDGE)),
    y: Math.min(Math.max(EDGE, state.y), Math.max(EDGE, window.innerHeight - height - EDGE)),
  };
}

/** A movable, resizable window modal that keeps IK FINANCE forms inside the viewport. */
export default function AdvancedModal({ title, onClose, children, className = '', initialWidth = 620, initialHeight = 620 }: AdvancedModalProps) {
  const isMobile = () => window.innerWidth < 640;
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [windowState, setWindowState] = useState<WindowState>(() => {
    const width = isMobile() ? window.innerWidth - EDGE * 2 : Math.min(initialWidth, window.innerWidth - EDGE * 2);
    const height = isMobile() ? window.innerHeight - EDGE * 2 : Math.min(initialHeight, window.innerHeight - EDGE * 2);
    return { width, height, x: (window.innerWidth - width) / 2, y: (window.innerHeight - height) / 2 };
  });
  const previous = useRef<WindowState | null>(null);
  const action = useRef<{ kind: 'drag' | 'resize'; startX: number; startY: number; state: WindowState } | null>(null);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    const onResize = () => setWindowState(current => fitToViewport(current));
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', onKeyDown); window.removeEventListener('resize', onResize); };
  }, [onClose]);

  const beginAction = (event: PointerEvent<HTMLDivElement>, kind: 'drag' | 'resize') => {
    if (isMobile() || maximized) return;
    event.preventDefault();
    action.current = { kind, startX: event.clientX, startY: event.clientY, state: windowState };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveAction = (event: PointerEvent<HTMLDivElement>) => {
    const current = action.current;
    if (!current) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (current.kind === 'drag') {
      setWindowState(fitToViewport({ ...current.state, x: current.state.x + dx, y: current.state.y + dy }));
    } else {
      setWindowState(fitToViewport({ ...current.state, width: Math.max(360, current.state.width + dx), height: Math.max(220, current.state.height + dy) }));
    }
  };

  const toggleMaximize = () => {
    if (maximized) {
      setWindowState(fitToViewport(previous.current ?? windowState));
      setMaximized(false);
    } else {
      previous.current = windowState;
      setWindowState({ x: EDGE, y: EDGE, width: window.innerWidth - EDGE * 2, height: window.innerHeight - EDGE * 2 });
      setMaximized(true);
      setMinimized(false);
    }
  };

  const style: CSSProperties = isMobile() || maximized
    ? { inset: EDGE }
    : { left: windowState.x, top: windowState.y, width: windowState.width, height: minimized ? undefined : windowState.height };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm" aria-modal="true" role="dialog" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        className={`fixed flex w-[calc(100%_-_2rem)] flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl shadow-black/50 sm:w-auto ${className}`}
        style={style}
        onPointerMove={moveAction}
        onPointerUp={() => { action.current = null; }}
      >
        <header className="flex min-h-12 shrink-0 touch-none items-center justify-between border-b border-gray-800 bg-gray-900/95 px-3 sm:px-4" onPointerDown={(event) => beginAction(event, 'drag')}>
          <h2 className="truncate pr-3 text-sm font-semibold text-white">{title}</h2>
          <div className="flex items-center gap-1" onPointerDown={(event) => event.stopPropagation()}>
            <button type="button" aria-label="Minimizar" title="Minimizar" onClick={() => setMinimized(value => !value)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"><Minimize2 size={16} /></button>
            <button type="button" aria-label={maximized ? 'Restaurar' : 'Maximizar'} title={maximized ? 'Restaurar' : 'Maximizar'} onClick={toggleMaximize} className="hidden rounded-md p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white sm:block">{maximized ? <Square size={14} /> : <Maximize2 size={16} />}</button>
            <button type="button" aria-label="Fechar" title="Fechar" onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-red-500/15 hover:text-red-300"><X size={17} /></button>
          </div>
        </header>
        {!minimized && <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">{children}</div>}
        {!isMobile() && !maximized && !minimized && <div aria-label="Redimensionar janela" className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize before:absolute before:bottom-1 before:right-1 before:h-2 before:w-2 before:border-b-2 before:border-r-2 before:border-gray-500" onPointerDown={(event) => beginAction(event, 'resize')} />}
      </section>
    </div>
  );
}
