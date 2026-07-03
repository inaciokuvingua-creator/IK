import { useRef, useState } from 'react';
import { Paperclip, Trash2, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Props = {
  bucket: string;
  path: string;
  currentUrl?: string | null;
  currentName?: string | null;
  onUploaded: (url: string | null, name: string | null) => void;
  maxMb?: number;
  label?: string;
};

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['mp3','wav','flac','ogg','aac'].includes(ext)) return '🎵';
  if (['mp4','mov','avi','mkv'].includes(ext)) return '🎬';
  if (['pdf'].includes(ext)) return '📄';
  if (['zip','rar','7z'].includes(ext)) return '📦';
  if (['jpg','jpeg','png','webp','gif','svg'].includes(ext)) return '🖼️';
  if (['doc','docx'].includes(ext)) return '📝';
  if (['xls','xlsx'].includes(ext)) return '📊';
  if (['ppt','pptx'].includes(ext)) return '📑';
  if (['apk'].includes(ext)) return '📱';
  return '📎';
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUpload({
  bucket, path, currentUrl, currentName,
  onUploaded, maxMb = 100, label = 'Arquivo do produto',
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localFile, setLocalFile] = useState<{ name: string; size: number } | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (file.size > maxMb * 1024 * 1024) {
      alert(`Ficheiro demasiado grande. Máximo ${maxMb} MB.`);
      return;
    }
    setUploading(true);
    setProgress(0);
    setLocalFile({ name: file.name, size: file.size });

    try {
      const fullPath = `${path}/${file.name}`;
      const { error } = await supabase.storage.from(bucket).upload(fullPath, file, { upsert: true });
      if (error) throw error;
      setProgress(100);
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fullPath);
      onUploaded(publicUrl, file.name);
    } catch (e) {
      console.error(e);
      setLocalFile(null);
    }
    setUploading(false);
  };

  const remove = () => {
    setLocalFile(null);
    onUploaded(null, null);
  };

  const hasFile = localFile || (currentUrl && currentName);
  const displayName = localFile?.name ?? currentName ?? '';
  const displaySize = localFile?.size;

  return (
    <div>
      <label className="text-xs text-gray-500 mb-2 block">{label}</label>

      {hasFile ? (
        <div className="flex items-center gap-3 p-3.5 bg-gray-800/60 border border-gray-700 rounded-xl">
          <span className="text-2xl shrink-0">{fileIcon(displayName)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{displayName}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {displaySize ? fmtSize(displaySize) : 'Carregado'}
              {uploading && ` · A enviar…`}
              {!uploading && localFile && <span className="text-emerald-400 ml-1 inline-flex items-center gap-0.5"><CheckCircle2 size={10} /> Pronto</span>}
            </p>
          </div>
          {!uploading && (
            <button type="button" onClick={remove}
              className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors">
              <Trash2 size={13} />
            </button>
          )}
          {uploading && <Loader2 size={16} className="text-emerald-400 animate-spin shrink-0" />}
        </div>
      ) : (
        <div
          onClick={() => ref.current?.click()}
          className="flex flex-col items-center justify-center gap-2 p-6 bg-gray-800/40 border-2 border-dashed border-gray-700 hover:border-gray-600 rounded-xl cursor-pointer transition-colors group"
        >
          <Paperclip size={20} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
          <div className="text-center">
            <p className="text-gray-400 text-sm font-medium group-hover:text-white transition-colors">Clique para carregar</p>
            <p className="text-gray-600 text-xs mt-0.5">Qualquer formato · Máx {maxMb} MB</p>
          </div>
        </div>
      )}
      <input ref={ref} type="file" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
    </div>
  );
}
