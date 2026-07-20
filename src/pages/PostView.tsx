import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Loader2, MessageCircle, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Post = {
  id: string;
  user_id: string;
  content: string | null;
  nome: string | null;
  username: string | null;
  avatar_url: string | null;
  image_urls: string[] | null;
  created_at: string;
};

type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  nome: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
};

export default function PostView({ postId }: { postId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .single();
        if (error) throw error;
        setPost(data as Post);

        const { data: cData } = await supabase.rpc('get_post_comments', { p_post_id: postId });
        setComments((cData ?? []) as PostComment[]);
      } catch (e) {
        console.error('load post', e);
        setPost(null);
      } finally {
        setLoading(false);
      }
    };
    if (postId) load();
  }, [postId]);

  const addComment = async () => {
    if (!user || !commentText.trim()) return;
    setPosting(true);
    try {
      const { error } = await supabase.rpc('add_post_comment', {
        p_post_id: postId,
        p_user_id: user.id,
        p_content: commentText.trim(),
      });
      if (error) throw error;
      setCommentText('');
      const { data: cData } = await supabase.rpc('get_post_comments', { p_post_id: postId });
      setComments((cData ?? []) as PostComment[]);
    } catch (e) {
      console.error('add comment', e);
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-gray-500" size={28} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Publicação não encontrada.</p>
        <button onClick={() => navigate('/?page=comunidades')} className="mt-4 text-emerald-400 text-sm hover:underline">
          Voltar à comunidade
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button
        onClick={() => navigate('/?page=comunidades')}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
      >
        <ArrowLeft size={16} />
        Voltar à comunidade
      </button>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          {post.avatar_url ? (
            <img src={post.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
              {(post.nome || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-white font-semibold">{post.nome || 'Usuário'}</p>
            <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString()}</p>
          </div>
        </div>

        {post.content && <p className="text-white mt-4 whitespace-pre-wrap">{post.content}</p>}

        {Array.isArray(post.image_urls) && post.image_urls.length > 0 && (
          <div className={`mt-3 grid gap-2 ${post.image_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {post.image_urls.map((src, i) => (
              <img key={i} src={src} alt="" className="w-full max-h-96 object-cover rounded-xl border border-gray-800" />
            ))}
          </div>
        )}
      </div>

      {/* Comentários */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <MessageCircle size={16} className="text-emerald-400" />
          Comentários ({comments.length})
        </p>

        {comments.map(c => (
          <div key={c.id} className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {(c.nome || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="bg-gray-800 rounded-xl px-3 py-2 flex-1">
              <p className="text-sm text-white font-semibold">{c.nome || 'Usuário'}</p>
              <p className="text-sm text-gray-300">{c.content}</p>
            </div>
          </div>
        ))}

        {user && (
          <div className="flex gap-2 pt-2">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addComment(); }}
              placeholder="Escreve um comentário..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
            <button onClick={addComment} disabled={posting} className="px-3 py-2 bg-emerald-500 text-white rounded-xl disabled:opacity-50">
              {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
