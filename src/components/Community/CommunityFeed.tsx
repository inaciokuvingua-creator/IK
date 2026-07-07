import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function CommunityFeed({ query }: { query?: string }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // Reuse posts table if exists
      const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(20);
      setPosts(data || []);
    } catch (e) { console.error('feed load', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
        <textarea placeholder="O que está a acontecer?" className="input w-full h-24" />
        <div className="mt-2 flex justify-end">
          <button className="btn btn-primary">Publicar</button>
        </div>
      </div>

      <div className="space-y-4">
        {loading && <div className="text-gray-400">A carregar...</div>}
        {posts.map((p) => (
          <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="text-sm text-gray-300 font-medium">{p.title || 'Publicação'}</div>
            <div className="text-sm text-gray-400 mt-2">{p.content}</div>
            <div className="mt-3 flex items-center gap-2">
              <button className="btn btn-ghost btn-sm">Gostar</button>
              <button className="btn btn-ghost btn-sm">Comentar</button>
              <button className="btn btn-ghost btn-sm">Partilhar</button>
            </div>
          </div>
        ))}
        {posts.length === 0 && !loading && <div className="text-gray-500">Nenhuma publicação ainda.</div>}
      </div>
    </div>
  );
}
