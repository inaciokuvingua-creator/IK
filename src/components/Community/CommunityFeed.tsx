import React, { useEffect, useState } from 'react';
import { Send, Heart, MessageCircle, Share2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';

type Post = {
  id: string;
  user_id: string;
  content: string;
  title?: string;
  created_at: string;
  author_nome?: string;
  author_avatar?: string;
};

export default function CommunityFeed({ query }: { query?: string }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      setPosts(data ?? []);
    } catch (e) {
      console.error('feed load', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handlePost = async () => {
    if (!text.trim() || !user) return;
    setPosting(true);
    try {
      const { data } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: text.trim(),
          author_nome: profile?.display_name ?? profile?.nome ?? user.email?.split('@')[0],
          author_avatar: profile?.avatar_url ?? null,
        })
        .select()
        .single();
      if (data) setPosts(prev => [data, ...prev]);
      setText('');
    } catch (e) {
      console.error('post error', e);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Compose box */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
              {(profile?.display_name ?? profile?.nome ?? 'U')[0]?.toUpperCase()}
            </div>
          )}
          <textarea
            placeholder="Partilhe algo com a comunidade..."
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            className="flex-1 bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-emerald-700 placeholder-gray-600"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handlePost}
            disabled={!text.trim() || posting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Publicar
          </button>
        </div>
      </div>

      {/* Posts */}
      {loading && posts.length === 0 ? (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="text-emerald-500 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <MessageCircle size={28} className="text-gray-700 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Nenhuma publicação ainda. Seja o primeiro!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(p => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                {p.author_avatar ? (
                  <img src={p.author_avatar} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
                    {(p.author_nome ?? 'U')[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{p.author_nome ?? 'Utilizador'}</span>
                    <span className="text-xs text-gray-600">
                      {new Date(p.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {p.title && <p className="text-sm font-semibold text-white mt-1">{p.title}</p>}
                  <p className="text-sm text-gray-300 mt-1 leading-relaxed">{p.content}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 ml-12">
                <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                  <Heart size={13} /> Gostar
                </button>
                <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-400 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                  <MessageCircle size={13} /> Comentar
                </button>
                <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-400 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                  <Share2 size={13} /> Partilhar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
