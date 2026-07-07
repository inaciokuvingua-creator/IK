import { useRef, useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isMarketplaceFileAllowed } from '../lib/marketplace';

type Props = {
  bucket: string;
  folder?: string;
  value?: string[];
  onChange?: (urls: string[]) => void;
  accept?: string;
  maxSizeMb?: number;
};

export default function MultiImageUpload({ bucket, folder, value = [], onChange, accept = 'image/*', maxSizeMb = 10 }: Props) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const [local, setLocal] = useState<string[]>(value);

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > maxSizeMb * 1024 * 1024) continue;
        if (!isMarketplaceFileAllowed(file)) continue;
        const safeName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        const fullPath = folder ? `${folder}/${safeName}` : `${safeName}`;
        const { error } = await supabase.storage.from(bucket).upload(fullPath, file, { upsert: true });
        if (error) continue;
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fullPath);
        uploaded.push(`${publicUrl}?t=${Date.now()}`);
      }
      const next = [...local, ...uploaded];
      setLocal(next);
      onChange?.(next);
    } catch (e) {
      console.error(e);
    }
    setUploading(false);
  };

  const remove = (idx: number) => {
    const next = local.filter((_, i) => i !== idx);
    setLocal(next);
    onChange?.(next);
  };

  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {local.map((src, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
            <img src={src} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => remove(i)} className="absolute top-1 right-1 p-1 bg-black/40 rounded-full text-white">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <div onClick={() => ref.current?.click()} className="w-20 h-20 rounded-lg bg-gray-800 border border-dashed border-gray-700 flex items-center justify-center cursor-pointer">
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
        </div>
      </div>
      <input ref={ref} type="file" accept={accept} multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
    </div>
  );
}
