import { useRef, useState } from 'react';
import { Camera, Trash2, Upload, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Props = {
  bucket: string;
  // old API: full path base (without extension) or explicit path handling
  path?: string;
  // new API aliases used in forms
  folder?: string; // upload folder inside the bucket
  value?: string | null; // alias to currentUrl
  currentUrl?: string | null;
  onUploaded?: (url: string | null) => void; // alias-friendly
  onChange?: (url: string | null) => void; // alias used by forms
  shape?: 'square' | 'circle';
  size?: 'sm' | 'md' | 'lg';
  placeholder?: string;
  accept?: string;
};

const SIZES = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

export default function ImageUpload({
  bucket, path, folder, currentUrl, value, onUploaded, onChange,
  shape = 'square', size = 'md',
  placeholder = 'Foto',
  accept = 'image/jpeg,image/png,image/webp',
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';
  const sizeClass = SIZES[size];
  // support both `currentUrl` and `value` prop names
  const displaySrc = preview ?? currentUrl ?? value ?? null;

  const effectiveOnUploaded = onUploaded ?? onChange ?? (() => {});

  const upload = async (file: File) => {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      // Determine target path
      let fullPath: string;
      if (path) {
        // legacy: path is a base (without extension)
        fullPath = `${path}.${ext}`;
      } else if (folder) {
        // new: folder provided — store under folder with timestamp to avoid collisions
        const safeName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        fullPath = `${folder}/${safeName}`;
      } else {
        // fallback: use filename in root
        fullPath = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      }

      const { error } = await supabase.storage.from(bucket).upload(fullPath, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fullPath);
      effectiveOnUploaded(`${publicUrl}?t=${Date.now()}`);
    } catch (e) {
      setPreview(null);
      console.error(e);
    }
    setUploading(false);
  };

  const remove = async () => {
    setUploading(true);
    try {
      // Try to remove by known path if provided
      if (path) {
        await supabase.storage.from(bucket).remove([`${path}.jpg`, `${path}.png`, `${path}.webp`]);
      } else if ((currentUrl ?? value) && folder) {
        // extract filename from public url and remove that specific file inside folder
        const url = (currentUrl ?? value) as string;
        const marker = `/storage/v1/object/public/${bucket}/`;
        const idx = url.indexOf(marker);
        if (idx !== -1) {
          const publicPath = url.substring(idx + marker.length).split('?')[0];
          // remove exact file
          await supabase.storage.from(bucket).remove([publicPath]);
        }
      }
      setPreview(null);
      effectiveOnUploaded(null);
    } catch {}
    setUploading(false);
  };

  return (
    <div className="flex items-center gap-4">
      <div className={`relative ${sizeClass} ${radius} overflow-hidden bg-gray-800 border-2 border-dashed border-gray-700 flex items-center justify-center cursor-pointer group shrink-0`}
        onClick={() => ref.current?.click()}>
        {displaySrc ? (
          <img src={displaySrc} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Camera size={size === 'sm' ? 14 : 18} className="text-gray-600" />
            {size !== 'sm' && <span className="text-gray-600 text-[10px]">{placeholder}</span>}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 size={18} className="text-white animate-spin" />
          </div>
        )}
        {!uploading && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera size={16} className="text-white" />
          </div>
        )}
        <input ref={ref} type="file" accept={accept} className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      </div>
      <div className="flex flex-col gap-1.5">
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
          <Upload size={11} /> {displaySrc ? 'Trocar' : 'Carregar'} imagem
        </button>
        {displaySrc && (
          <button type="button" onClick={remove} disabled={uploading}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 border border-gray-700 hover:border-red-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            <Trash2 size={11} /> Remover
          </button>
        )}
        <p className="text-gray-600 text-[10px]">JPG, PNG ou WebP · Máx 10 MB</p>
      </div>
    </div>
  );
}
