import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, BookOpen, Download, FileArchive, FileText, Image as ImageIcon, Lock, Maximize2, Minimize2, MoonStar, Music2, Pause, Play, RotateCw, Search, Share2, SkipBack, SkipForward, Sparkles, SunMedium, Video, Volume2, VolumeX, X, ZoomIn, ZoomOut, Eye } from 'lucide-react';
import { useAI } from '../context/AIContext';

export type ViewerFile = {
  url: string;
  name: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: string;
  description?: string;
  allowDownload?: boolean;
  watermarkText?: string;
  playlist?: ViewerFile[];
  playlistIndex?: number;
};

type ViewerKind = 'image' | 'audio' | 'video' | 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'text' | 'archive' | 'other';

function detectKind(name: string, mimeType?: string): ViewerKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const lowerMime = mimeType?.toLowerCase() ?? '';

  if (lowerMime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'heic', 'bmp', 'tiff'].includes(ext)) return 'image';
  if (lowerMime.startsWith('audio/') || ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'opus'].includes(ext)) return 'audio';
  if (lowerMime.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'mpeg', 'mpg'].includes(ext)) return 'video';
  if (ext === 'pdf' || lowerMime.includes('pdf')) return 'pdf';
  if (['doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'epub'].includes(ext) || lowerMime.includes('text') || lowerMime.includes('officedocument')) return 'document';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet';
  if (['ppt', 'pptx'].includes(ext)) return 'presentation';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || lowerMime.includes('zip') || lowerMime.includes('archive')) return 'archive';
  return 'other';
}

function formatBytes(bytes?: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeType(name: string, mimeType?: string) {
  if (mimeType) return mimeType;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    mp4: 'video/mp4',
    webm: 'video/webm',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    zip: 'application/zip',
  };
  return map[ext] ?? 'application/octet-stream';
}

export function openIKViewer(file: ViewerFile) {
  window.dispatchEvent(new CustomEvent('openIKViewer', { detail: file }));
}

export default function IKViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<ViewerFile | null>(null);
  const [recentFiles, setRecentFiles] = useState<ViewerFile[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [documentText, setDocumentText] = useState('');
  const [documentSearch, setDocumentSearch] = useState('');
  const [playlist, setPlaylist] = useState<ViewerFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [miniPlayerOpen, setMiniPlayerOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const audioVideoRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);
  const { sendMessage } = useAI();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ik-viewer-recent-files');
      if (stored) {
        const parsed = JSON.parse(stored) as ViewerFile[];
        setRecentFiles(parsed.filter((item) => item?.url && item?.name));
      }
    } catch {
      setRecentFiles([]);
    }
  }, []);

  const persistRecentFile = (item: ViewerFile) => {
    const normalized = { ...item, playlist: undefined, playlistIndex: undefined };
    setRecentFiles((prev) => {
      const next = [normalized, ...prev.filter((entry) => entry.url !== normalized.url || entry.name !== normalized.name)].slice(0, 8);
      try {
        localStorage.setItem('ik-viewer-recent-files', JSON.stringify(next));
      } catch {
        // ignore storage issues
      }
      return next;
    });
  };

  const clearRecentFiles = () => {
    setRecentFiles([]);
    try {
      localStorage.removeItem('ik-viewer-recent-files');
    } catch {
      // ignore storage issues
    }
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ViewerFile>).detail;
      if (!detail?.url || !detail?.name) return;
      const incomingPlaylist = detail.playlist && detail.playlist.length ? detail.playlist : [detail];
      const targetIndex = typeof detail.playlistIndex === 'number' ? detail.playlistIndex : 0;
      const targetFile = incomingPlaylist[targetIndex] ?? detail;
      setFile(targetFile);
      setPlaylist(incomingPlaylist);
      persistRecentFile(targetFile);
      setCurrentIndex(targetIndex);
      setIsOpen(true);
      setZoom(1);
      setRotation(0);
      setPlaybackRate(1);
      setLoop(false);
      setFullscreen(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setVolume(1);
      setMuted(false);
      setDocumentText('');
      setDocumentSearch('');
      setMiniPlayerOpen(['audio', 'video'].includes(detectKind(targetFile.name, targetFile.mimeType)));
    };

    window.addEventListener('openIKViewer', handler as EventListener);
    return () => window.removeEventListener('openIKViewer', handler as EventListener);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      } else if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setFullscreen((value) => !value);
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setZoom((value) => Math.min(3, Number((value + 0.25).toFixed(2))));
      } else if (event.key === '-') {
        event.preventDefault();
        setZoom((value) => Math.max(0.5, Number((value - 0.25).toFixed(2))));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!fullscreen) {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      }
      return;
    }
    void document.documentElement.requestFullscreen().catch(() => setFullscreen(false));
  }, [fullscreen]);

  const kind = useMemo(() => (file ? detectKind(file.name, file.mimeType) : 'other'), [file]);
  const mimeType = useMemo(() => (file ? getMimeType(file.name, file.mimeType) : 'application/octet-stream'), [file]);
  const watermarkText = file?.watermarkText ?? 'IK FINANCE';
  const canDownload = file?.allowDownload !== false;

  const formatTime = (value: number) => {
    if (!Number.isFinite(value) || value < 0) return '00:00';
    const minutes = Math.floor(value / 60).toString().padStart(2, '0');
    const seconds = Math.floor(value % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const openViewerItem = (item: ViewerFile, index = 0) => {
    const incomingPlaylist = item.playlist && item.playlist.length ? item.playlist : [item];
    const targetIndex = index >= 0 && index < incomingPlaylist.length ? index : 0;
    const targetFile = incomingPlaylist[targetIndex] ?? item;
    setFile(targetFile);
    setPlaylist(incomingPlaylist);
    persistRecentFile(targetFile);
    setCurrentIndex(targetIndex);
    setIsOpen(true);
    setZoom(1);
    setRotation(0);
    setPlaybackRate(1);
    setLoop(false);
    setFullscreen(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setVolume(1);
    setMuted(false);
    setDocumentText('');
    setDocumentSearch('');
    setMiniPlayerOpen(['audio', 'video'].includes(detectKind(targetFile.name, targetFile.mimeType)));
  };

  const openPlaylistItem = (delta: number) => {
    if (playlist.length <= 1) return;
    const nextIndex = (currentIndex + delta + playlist.length) % playlist.length;
    const nextFile = playlist[nextIndex];
    if (nextFile) {
      openViewerItem(nextFile, nextIndex);
    }
  };

  const togglePlayback = async () => {
    const element = audioVideoRef.current;
    if (!element) return;
    if (element.paused) {
      try {
        await element.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      element.pause();
      setIsPlaying(false);
    }
  };

  const seekTo = (value: number) => {
    const element = audioVideoRef.current;
    if (!element) return;
    element.currentTime = value;
    setCurrentTime(value);
  };

  const changeVolume = (value: number) => {
    const element = audioVideoRef.current;
    if (!element) return;
    element.volume = value;
    setVolume(value);
    setMuted(value === 0);
  };

  const toggleMute = () => {
    const element = audioVideoRef.current;
    if (!element) return;
    element.muted = !element.muted;
    setMuted(element.muted);
    if (!element.muted) {
      setVolume((value) => (value === 0 ? 0.5 : value));
    }
  };

  const jumpBy = (seconds: number) => {
    const element = audioVideoRef.current;
    if (!element) return;
    const next = Math.max(0, Math.min(element.duration || 0, element.currentTime + seconds));
    element.currentTime = next;
    setCurrentTime(next);
  };

  useEffect(() => {
    const element = audioVideoRef.current;
    if (!element) return;
    element.playbackRate = playbackRate;
  }, [playbackRate, file?.url]);

  useEffect(() => {
    if (!file) return;
    const textExtensions = ['txt', 'md', 'csv', 'json', 'xml', 'log'];
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const canPreviewText = textExtensions.includes(ext) || file.mimeType?.startsWith('text/') || false;
    if (!canPreviewText) {
      setDocumentText('');
      return;
    }
    let cancelled = false;
    fetch(file.url)
      .then((response) => {
        if (!response.ok) throw new Error('failed');
        return response.text();
      })
      .then((content) => {
        if (!cancelled) setDocumentText(content);
      })
      .catch(() => {
        if (!cancelled) setDocumentText('');
      });
    return () => {
      cancelled = true;
    };
  }, [file?.url, file?.mimeType, file?.name]);

  const documentPreviewLines = useMemo(() => {
    if (!documentText) return [];
    const search = documentSearch.trim().toLowerCase();
    const lines = documentText.split(/\r?\n/);
    if (!search) return lines.slice(0, 24);
    return lines.filter((line) => line.toLowerCase().includes(search)).slice(0, 24);
  }, [documentSearch, documentText]);

  const generateAiInsight = async (mode: 'summary' | 'ocr' | 'transcribe') => {
    if (!file) return;
    setAiLoading(true);
    setAiError('');
    setAiSummary('');

    let prompt = '';
    const base = `Arquivo: ${file.name}\nTipo: ${kind}\nTamanho: ${formatBytes(file.size)}\n`;

    if (kind === 'document' || kind === 'text' || kind === 'spreadsheet' || kind === 'presentation' || kind === 'pdf') {
      try {
        const response = await fetch(file.url);
        const text = await response.text();
        prompt = mode === 'summary'
          ? `${base}\n\nResumo este conteúdo de forma objetiva e útil para o utilizador.\n\nConteúdo:\n${text.slice(0, 12000)}`
          : `${base}\n\nExtraia o texto relevante e apresente-o em formato claro.\n\nConteúdo:\n${text.slice(0, 12000)}`;
      } catch {
        prompt = mode === 'summary'
          ? `${base}\n\nResuma este ficheiro de forma útil.`
          : `${base}\n\nExtraia o texto relevante deste ficheiro.`;
      }
    } else if (mode === 'transcribe' && (kind === 'audio' || kind === 'video')) {
      prompt = `${base}\n\nTranscreva o conteúdo deste ${kind === 'audio' ? 'áudio' : 'vídeo'} de forma clara, incluindo os pontos principais e qualquer fala identificável.`;
    } else {
      prompt = mode === 'summary'
        ? `${base}\n\nCrie um resumo curto e útil para este ficheiro.`
        : mode === 'ocr'
          ? `${base}\n\nExtraia qualquer texto visível ou relevante deste conteúdo e apresente-o de forma clara.`
          : `${base}\n\nFaça uma descrição textual do conteúdo deste ficheiro.`;
    }

    const result = await sendMessage(prompt, [], 'geral', undefined, {
      file: {
        name: file.name,
        mimeType: file.mimeType ?? mimeType,
        url: file.url,
        kind,
      },
    });
    if (result?.message) {
      setAiSummary(result.message);
    } else {
      setAiError('Não foi possível obter uma resposta da IA neste momento.');
    }
    setAiLoading(false);
  };

  const renderBody = () => {
    if (!file) return null;

    if (kind === 'image') {
      return (
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className={`relative mx-auto flex min-h-full items-center justify-center rounded-3xl border border-white/10 ${theme === 'dark' ? 'bg-slate-950/70' : 'bg-white/80'} p-4 shadow-2xl`}>
            <img
              src={file.url}
              alt={file.name}
              className="max-h-[70vh] w-auto max-w-full rounded-2xl object-contain shadow-lg transition-transform duration-200"
              style={{ transform: `rotate(${rotation}deg) scale(${zoom})` }}
            />
            <div className={`pointer-events-none absolute bottom-4 right-4 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] opacity-75 ${theme === 'dark' ? 'border-white/20 bg-slate-950/70 text-white' : 'border-slate-300 bg-white/80 text-slate-700'}`}>
              {watermarkText}
            </div>
            <div className={`absolute left-4 top-4 flex flex-wrap items-center gap-2 rounded-2xl border p-3 ${theme === 'dark' ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white/90'}`}>
              <button type="button" onClick={() => void generateAiInsight('summary')} className={`rounded-xl border px-3 py-2 text-sm ${theme === 'dark' ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {aiLoading ? 'A gerar…' : 'Resumo IA'}
              </button>
              <button type="button" onClick={() => void generateAiInsight('ocr')} className={`rounded-xl border px-3 py-2 text-sm ${theme === 'dark' ? 'border-sky-700 bg-sky-500/10 text-sky-300' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>
                OCR IA
              </button>
            </div>
            {aiSummary ? (
              <div className={`absolute bottom-16 left-4 right-4 rounded-2xl border p-4 text-sm leading-7 shadow-lg ${theme === 'dark' ? 'border-emerald-800 bg-emerald-950/70 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                <p className="mb-2 font-semibold">Resposta da IA</p>
                <p className="whitespace-pre-wrap">{aiSummary}</p>
              </div>
            ) : null}
            {aiError ? (
              <div className={`absolute bottom-16 left-4 right-4 rounded-2xl border p-4 text-sm ${theme === 'dark' ? 'border-amber-800 bg-amber-950/70 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                {aiError}
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    if (kind === 'audio') {
      return (
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className={`mx-auto flex max-w-3xl flex-col gap-4 rounded-3xl border border-white/10 ${theme === 'dark' ? 'bg-slate-950/70' : 'bg-white/80'} p-6 shadow-2xl`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${theme === 'dark' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-500/10 text-emerald-600'}`}>
                <Music2 size={20} />
              </div>
              <div>
                <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{file.name}</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Reprodução nativa no IK Viewer</p>
              </div>
            </div>
            <audio
              ref={(element) => {
                audioVideoRef.current = element;
              }}
              className="hidden"
              preload="metadata"
              loop={loop}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedMetadata={() => setDuration(audioVideoRef.current?.duration || 0)}
              onTimeUpdate={() => setCurrentTime(audioVideoRef.current?.currentTime || 0)}
              onEnded={() => setIsPlaying(false)}
            >
              <source src={file.url} type={mimeType} />
            </audio>
            <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={togglePlayback} className={`flex h-10 w-10 items-center justify-center rounded-full ${theme === 'dark' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-500/10 text-emerald-600'}`}>
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <div className="flex-1">
                  <input type="range" min="0" max={duration || 1} step="1" value={currentTime} onChange={(event) => seekTo(Number(event.target.value))} className="w-full accent-emerald-500" />
                  <div className={`mt-1 flex justify-between text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => jumpBy(-10)} className={`rounded-xl border px-3 py-2 text-sm ${theme === 'dark' ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-700'}`}>-10s</button>
                <button type="button" onClick={() => jumpBy(10)} className={`rounded-xl border px-3 py-2 text-sm ${theme === 'dark' ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-700'}`}>+10s</button>
                <button type="button" onClick={toggleMute} className={`rounded-xl border px-3 py-2 text-sm ${theme === 'dark' ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-700'}`}>
                  {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => changeVolume(Number(event.target.value))} className="w-24 accent-emerald-500" />
                <label className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  <span>Velocidade</span>
                  <select value={playbackRate} onChange={(event) => setPlaybackRate(Number(event.target.value))} className={`rounded-xl border px-3 py-2 text-sm ${theme === 'dark' ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800'}`}>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((value) => (
                      <option key={value} value={value}>{value}x</option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={() => setLoop((value) => !value)} className={`rounded-xl border px-3 py-2 text-sm ${loop ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400' : theme === 'dark' ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-700'}`}>
                  {loop ? 'Repetição ligada' : 'Repetição desligada'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (kind === 'video') {
      return (
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className={`mx-auto flex max-w-5xl flex-col gap-3 rounded-3xl border border-white/10 ${theme === 'dark' ? 'bg-slate-950/70' : 'bg-white/80'} p-4 shadow-2xl`}>
            <video
              ref={(element) => {
                audioVideoRef.current = element;
              }}
              controls
              playsInline
              preload="metadata"
              className="w-full rounded-2xl bg-black"
              poster=""
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedMetadata={() => setDuration(audioVideoRef.current?.duration || 0)}
              onTimeUpdate={() => setCurrentTime(audioVideoRef.current?.currentTime || 0)}
              onEnded={() => setIsPlaying(false)}
            >
              <source src={file.url} type={mimeType} />
            </video>
            <div className={`relative rounded-2xl border p-4 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'}`}>
              <div className={`pointer-events-none absolute bottom-3 right-3 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] opacity-75 ${theme === 'dark' ? 'border-white/20 bg-slate-950/70 text-white' : 'border-slate-300 bg-white/80 text-slate-700'}`}>
                {watermarkText}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => jumpBy(-10)} className={`rounded-xl border px-3 py-2 text-sm ${theme === 'dark' ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-700'}`}><SkipBack size={14} /></button>
                <button type="button" onClick={togglePlayback} className={`flex h-10 w-10 items-center justify-center rounded-full ${theme === 'dark' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-500/10 text-emerald-600'}`}>
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button type="button" onClick={() => jumpBy(10)} className={`rounded-xl border px-3 py-2 text-sm ${theme === 'dark' ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-700'}`}><SkipForward size={14} /></button>
                <div className="flex items-center gap-2 text-sm">
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
              </div>
            </div>
            <div className={`mt-2 flex flex-wrap items-center gap-2 rounded-2xl border p-4 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'}`}>
              <button type="button" onClick={() => void generateAiInsight('summary')} className={`rounded-xl border px-3 py-2 text-sm ${theme === 'dark' ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {aiLoading ? 'A gerar…' : 'Resumo IA'}
              </button>
              <button type="button" onClick={() => void generateAiInsight('transcribe')} className={`rounded-xl border px-3 py-2 text-sm ${theme === 'dark' ? 'border-sky-700 bg-sky-500/10 text-sky-300' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>
                {kind === 'video' ? 'Descrição/legenda IA' : 'Transcrição IA'}
              </button>
            </div>
            {aiSummary ? (
              <div className={`mt-4 rounded-2xl border p-4 text-sm leading-7 ${theme === 'dark' ? 'border-emerald-800 bg-emerald-950/40 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                <p className="mb-2 font-semibold">Resposta da IA</p>
                <p className="whitespace-pre-wrap">{aiSummary}</p>
              </div>
            ) : null}
            {aiError ? (
              <div className={`mt-4 rounded-2xl border p-4 text-sm ${theme === 'dark' ? 'border-amber-800 bg-amber-950/40 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                {aiError}
              </div>
            ) : null}
            <div className={`rounded-2xl px-4 py-3 text-sm ${theme === 'dark' ? 'bg-slate-900/80 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
              Reproduzido no player nativo do IK Viewer com suporte a tela cheia, controles, velocidade e navegação rápida.
            </div>
          </div>
        </div>
      );
    }

    if (kind === 'pdf') {
      return (
        <div className="flex-1 overflow-hidden p-4 sm:p-6">
          <div className={`h-full overflow-hidden rounded-3xl border border-white/10 ${theme === 'dark' ? 'bg-slate-950/70' : 'bg-white/80'} shadow-2xl`}>
            <iframe src={file.url} title={file.name} className="h-full w-full" />
          </div>
        </div>
      );
    }

    if (kind === 'document' || kind === 'spreadsheet' || kind === 'presentation' || kind === 'text') {
      return (
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className={`mx-auto max-w-4xl rounded-3xl border border-white/10 ${theme === 'dark' ? 'bg-slate-950/70' : 'bg-white/80'} p-6 shadow-2xl`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${theme === 'dark' ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-500/10 text-blue-600'}`}>
                <FileText size={20} />
              </div>
              <div>
                <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{file.name}</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Preview embutido com suporte a leitura, zoom e download</p>
              </div>
            </div>
            <div className={`mt-5 rounded-2xl border p-4 text-sm leading-7 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/80 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
              Este formato é aberto nativamente dentro do IK Viewer. Se o navegador não renderizar o conteúdo diretamente, o sistema preserva a experiência com um painel de leitura e opções de download.
            </div>
            <div className={`mt-5 flex flex-wrap items-center gap-2 rounded-2xl border p-4 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'}`}>
              <button type="button" onClick={() => void generateAiInsight('summary')} className={`rounded-xl border px-3 py-2 text-sm ${theme === 'dark' ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {aiLoading ? 'A gerar…' : 'Resumo IA'}
              </button>
              <button type="button" onClick={() => void generateAiInsight('ocr')} className={`rounded-xl border px-3 py-2 text-sm ${theme === 'dark' ? 'border-sky-700 bg-sky-500/10 text-sky-300' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>
                Extração de texto
              </button>
            </div>
            {aiSummary ? (
              <div className={`mt-4 rounded-2xl border p-4 text-sm leading-7 ${theme === 'dark' ? 'border-emerald-800 bg-emerald-950/40 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                <p className="mb-2 font-semibold">Resumo gerado pela IA</p>
                <p className="whitespace-pre-wrap">{aiSummary}</p>
              </div>
            ) : null}
            {aiError ? (
              <div className={`mt-4 rounded-2xl border p-4 text-sm ${theme === 'dark' ? 'border-amber-800 bg-amber-950/40 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                {aiError}
              </div>
            ) : null}
            {documentText ? (
              <div className={`mt-5 rounded-2xl border p-4 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <BookOpen size={16} className="text-emerald-400" />
                    <span>Pré-visualização de texto</span>
                  </div>
                  <label className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${theme === 'dark' ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-700'}`}>
                    <Search size={14} />
                    <input value={documentSearch} onChange={(event) => setDocumentSearch(event.target.value)} placeholder="Pesquisar" className={`w-32 bg-transparent outline-none ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`} />
                  </label>
                </div>
                <pre className={`max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-2xl p-4 text-sm leading-7 ${theme === 'dark' ? 'bg-slate-950 text-slate-300' : 'bg-white text-slate-700'}`}>
                  {documentPreviewLines.length > 0 ? documentPreviewLines.join('\n') : 'Nenhuma correspondência encontrada.'}
                </pre>
              </div>
            ) : null}
            <iframe src={file.url} title={file.name} className="mt-5 h-[60vh] w-full rounded-2xl border-0" />
          </div>
        </div>
      );
    }

    if (kind === 'archive') {
      return (
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className={`mx-auto max-w-3xl rounded-3xl border border-white/10 ${theme === 'dark' ? 'bg-slate-950/70' : 'bg-white/80'} p-6 shadow-2xl`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${theme === 'dark' ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-500/10 text-amber-600'}`}>
                <FileArchive size={20} />
              </div>
              <div>
                <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{file.name}</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Arquivo compactado</p>
              </div>
            </div>
            <div className={`mt-5 rounded-2xl border p-4 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/80 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
              O IK Viewer suporta a abertura segura do pacote e permite baixar ou compartilhar o arquivo sem sair da plataforma.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className={`mx-auto max-w-3xl rounded-3xl border border-white/10 ${theme === 'dark' ? 'bg-slate-950/70' : 'bg-white/80'} p-6 shadow-2xl`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${theme === 'dark' ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'}`}>
              <AlertCircle size={20} />
            </div>
            <div>
              <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{file.name}</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Formato ainda não renderizado</p>
            </div>
          </div>
          <div className={`mt-5 rounded-2xl border p-4 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/80 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
            O conteúdo permanece aberto dentro do app e pode ser baixado ou compartilhado com segurança.
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xl">
      <div className={`flex h-full w-full flex-col ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 ${theme === 'dark' ? 'border-slate-800 bg-slate-950/90' : 'border-slate-200 bg-white/90'}`}>
          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${theme === 'dark' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-500/10 text-emerald-600'}`}>
              {kind === 'image' ? <ImageIcon size={18} /> : kind === 'audio' ? <Music2 size={18} /> : kind === 'video' ? <Video size={18} /> : <Eye size={18} />}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{file.name}</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{kind.toUpperCase()} · {formatBytes(file.size)} · {file.mimeType ?? mimeType}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className={`rounded-full border px-3 py-1 text-xs ${canDownload ? (theme === 'dark' ? 'border-emerald-700/60 bg-emerald-500/10 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700') : (theme === 'dark' ? 'border-amber-700/60 bg-amber-500/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700')}`}>
              {canDownload ? 'Download permitido' : 'Download bloqueado'}
            </div>
            {recentFiles.length > 0 && (
              <div className={`flex flex-wrap items-center gap-2 rounded-full border px-2 py-1 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white'}`}>
                <span className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Recentes</span>
                {recentFiles.slice(0, 3).map((item) => (
                  <button key={`${item.url}-${item.name}`} type="button" onClick={() => openViewerItem(item)} className={`rounded-full px-2 py-0.5 text-[11px] ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                    {item.name}
                  </button>
                ))}
                <button type="button" onClick={clearRecentFiles} className={`rounded-full px-2 py-0.5 text-[11px] ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                  Limpar
                </button>
              </div>
            )}
            {(kind === 'audio' || kind === 'video') && playlist.length > 1 && (
              <>
                <button type="button" onClick={() => openPlaylistItem(-1)} className={`rounded-xl border p-2 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}>
                  <SkipBack size={16} />
                </button>
                <button type="button" onClick={() => openPlaylistItem(1)} className={`rounded-xl border p-2 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}>
                  <SkipForward size={16} />
                </button>
              </>
            )}
            {kind === 'image' && (
              <>
                <button type="button" onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.25).toFixed(2))))} className={`rounded-xl border p-2 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}>
                  <ZoomOut size={16} />
                </button>
                <button type="button" onClick={() => setZoom((value) => Math.min(3, Number((value + 0.25).toFixed(2))))} className={`rounded-xl border p-2 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}>
                  <ZoomIn size={16} />
                </button>
                <button type="button" onClick={() => { setRotation((value) => (value + 90) % 360); setZoom(1); }} className={`rounded-xl border p-2 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}>
                  <RotateCw size={16} />
                </button>
              </>
            )}
            {(kind === 'audio' || kind === 'video') && (
              <button type="button" onClick={() => setMiniPlayerOpen((value) => !value)} className={`rounded-xl border p-2 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}>
                {miniPlayerOpen ? <Music2 size={16} /> : <Video size={16} />}
              </button>
            )}
            <button type="button" onClick={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))} className={`rounded-xl border p-2 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}>
              {theme === 'dark' ? <SunMedium size={16} /> : <MoonStar size={16} />}
            </button>
            <button type="button" onClick={() => setFullscreen((value) => !value)} className={`rounded-xl border p-2 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}>
              {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            {canDownload ? (
              <a href={file.url} download={file.name} className={`rounded-xl border p-2 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}>
                <Download size={16} />
              </a>
            ) : (
              <button type="button" className={`rounded-xl border p-2 opacity-70 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}>
                <Lock size={16} />
              </button>
            )}
            <button type="button" onClick={() => { if (navigator.share) void navigator.share({ title: file.name, text: file.description ?? 'Arquivo aberto no IK Viewer', url: file.url }); }} className={`rounded-xl border p-2 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}>
              <Share2 size={16} />
            </button>
            <button type="button" onClick={() => setIsOpen(false)} className={`rounded-xl border p-2 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {renderBody()}
        </div>

        <div className={`border-t px-4 py-3 sm:px-6 ${theme === 'dark' ? 'border-slate-800 bg-slate-950/90' : 'border-slate-200 bg-white/90'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles size={16} className="text-emerald-400" />
              <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>IK Viewer · visualização nativa, segura e integrada</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {playlist.length > 1 && (
                <div className={`rounded-full px-3 py-1 text-xs ${theme === 'dark' ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  Faixa {currentIndex + 1}/{playlist.length}
                </div>
              )}
              <div className={`rounded-full px-3 py-1 text-xs ${theme === 'dark' ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                {canDownload ? (file.description ?? 'Conteúdo aberto sem sair da plataforma') : 'Download bloqueado pelo proprietário'}
              </div>
            </div>
          </div>
        </div>

        {(kind === 'audio' || kind === 'video') && miniPlayerOpen && (
          <div className={`fixed bottom-4 right-4 z-[130] flex max-w-xs items-center gap-3 rounded-2xl border px-3 py-3 shadow-2xl ${theme === 'dark' ? 'border-slate-800 bg-slate-900/95 text-white' : 'border-slate-200 bg-white/95 text-slate-800'}`}>
            <button type="button" onClick={togglePlayback} className={`flex h-9 w-9 items-center justify-center rounded-full ${theme === 'dark' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-500/10 text-emerald-600'}`}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Mini player · {kind === 'audio' ? 'áudio' : 'vídeo'}</p>
            </div>
            <button type="button" onClick={() => setMiniPlayerOpen(false)} className={`rounded-lg p-1 ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
