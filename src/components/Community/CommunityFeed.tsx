import { useEffect, useState } from 'react';
import { Send, Heart, MessageCircle, Share2, Loader2, Trash2, ImagePlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import MultiImageUpload from '../MultiImageUpload';

type Post = {
  id: string;
  user_id: string;
  content: string | null;
  nome: string | null;
  username: string | null;
  avatar_url: string | null;
  image_urls: string[] | null;
  reactions_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
};

type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  nome: string | null;
  username: string | null;
  avatar_url: string | null;
  likes_count: number;
  replies_count?: number;
  created_at: string;
  updated_at: string;
};

export default function CommunityFeed({ query }: { query?: string }) {
  const { user } = useAuth();
  const { profile } = useProfile();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [posting, setPosting] = useState(false);

  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [sharingPost, setSharingPost] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`
          *,
          post_reactions(count),
          post_comments(count),
          post_shares(count)
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      const formattedPosts: Post[] = (postsData ?? []).map((post: any) => ({
        ...post,
        reactions_count: post.post_reactions?.[0]?.count ?? 0,
        comments_count: post.post_comments?.[0]?.count ?? 0,
        shares_count: post.post_shares?.[0]?.count ?? 0,
      }));

      setPosts(formattedPosts);
    } catch (error) {
      console.error('Erro carregando feed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const publish = async () => {
    if (!user) {
      alert('Faça login para publicar');
      return;
    }
    if (!text.trim() && images.length === 0) return;

    setPosting(true);
    try {
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: text.trim(),
        image_urls: images,
        nome: (profile as any)?.nome ?? (profile as any)?.full_name ?? null,
        username: (profile as any)?.username ?? null,
        avatar_url: (profile as any)?.avatar_url ?? null,
      });

      if (error) throw error;

      setText('');
      setImages([]);
      setShowUpload(false);
      await load();
    } catch (error) {
      console.error('Erro ao publicar:', error);
      alert('Não foi possível publicar. Tente novamente.');
    } finally {
      setPosting(false);
    }
  };

  const deletePost = async (postId: string) => {
    if (!user) return;

    const confirmDelete = window.confirm('Tem certeza que deseja excluir esta publicação?');
    if (!confirmDelete) return;

    setDeletingPost(postId);
    try {
      const { data, error } = await supabase.rpc('delete_post', {
        p_post_id: postId,
        p_user_id: user.id,
      });

      if (error) throw error;

      if (data?.action === 'deleted') {
        setPosts(prev => prev.filter(post => post.id !== postId));
      }
      if (data?.action === 'not_owner') {
        alert('Você não pode excluir esta publicação');
      }
    } catch (error) {
      console.error('delete error:', error);
    } finally {
      setDeletingPost(null);
    }
  };

  const sharePost = async (postId: string) => {
    if (!user) {
      alert('Faça login para compartilhar');
      return;
    }
    if (sharingPost === postId) return;

    setSharingPost(postId);
    try {
      const { data, error } = await supabase.rpc('share_post', {
        p_post_id: postId,
        p_user_id: user.id,
        p_shared_to: 'profile',
      });

      if (error) throw error;

      if (data?.action === 'shared') {
        await load();
      }
      if (data?.action === 'already_shared') {
        alert('Você já compartilhou esta publicação');
      }
    } catch (error) {
      console.error('share error', error);
    } finally {
      setSharingPost(null);
    }
  };

  const loadComments = async (postId: string) => {
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const { data, error } = await supabase.rpc('get_post_comments', {
        p_post_id: postId,
      });

      if (error) throw error;

      setCommentsByPost(prev => ({
        ...prev,
        [postId]: (data ?? []) as PostComment[],
      }));
    } catch (e) {
      console.error('load comments error', e);
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const toggleComments = async (postId: string) => {
    const next = !showComments[postId];
    setShowComments(prev => ({ ...prev, [postId]: next }));
    if (next && !commentsByPost[postId]) {
      await loadComments(postId);
    }
  };

  const addComment = async (postId: string) => {
    if (!user || !commentText[postId]?.trim()) return;

    try {
      const { error } = await supabase.rpc('add_post_comment', {
        p_post_id: postId,
        p_user_id: user.id,
        p_content: commentText[postId].trim(),
      });

      if (error) throw error;

      await loadComments(postId);
      await load();
      setCommentText(prev => ({ ...prev, [postId]: '' }));
    } catch (e) {
      console.error('add comment error', e);
    }
  };

  const visiblePosts = query?.trim()
    ? posts.filter(post =>
        (post.content ?? '').toLowerCase().includes(query.toLowerCase()) ||
        (post.nome ?? '').toLowerCase().includes(query.toLowerCase()) ||
        (post.username ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : posts;

  return (
    <div className="space-y-4">
      {/* Composer */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="No que estás a pensar?"
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-emerald-500"
        />

        {showUpload && (
          <div className="mt-3">
            <MultiImageUpload
              bucket="post-images"
              folder={user?.id}
              value={images}
              onChange={setImages}
            />
          </div>
        )}

        <div className="flex justify-between items-center mt-3">
          <button
            type="button"
            onClick={() => setShowUpload(v => !v)}
            className="flex items-center gap-2 text-gray-400 hover:text-emerald-400 text-sm"
          >
            <ImagePlus size={18} />
            Foto/Imagem
          </button>

          <button
            onClick={publish}
            disabled={posting || (!text.trim() && images.length === 0)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl disabled:opacity-50"
          >
            {posting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Publicar
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8 text-gray-400">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {!loading && visiblePosts.length === 0 && (
        <div className="text-center py-10 text-gray-400">Nenhuma publicação encontrada</div>
      )}

      {visiblePosts.map(post => (
        <div key={post.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex justify-between items-start">
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
                <p className="text-xs text-gray-500">
                  {new Date(post.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {user?.id === post.user_id && (
              <button
                onClick={() => deletePost(post.id)}
                disabled={deletingPost === post.id}
                className="text-red-500 hover:text-red-400 flex items-center gap-1 text-sm"
              >
                {deletingPost === post.id ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Excluir
                  </>
                )}
              </button>
            )}
          </div>

          {post.content && <p className="text-white mt-4 whitespace-pre-wrap">{post.content}</p>}

          {Array.isArray(post.image_urls) && post.image_urls.length > 0 && (
            <div className={`mt-3 grid gap-2 ${post.image_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {post.image_urls.map((src, i) => (
                <img key={i} src={src} alt="" className="w-full max-h-96 object-cover rounded-xl border border-gray-800" />
              ))}
            </div>
          )}

          <div className="flex gap-6 mt-4 text-gray-400">
            <button className="flex items-center gap-1.5 hover:text-red-400">
              <Heart size={18} />
              {post.reactions_count || 0}
            </button>

            <button onClick={() => toggleComments(post.id)} className="flex items-center gap-1.5 hover:text-emerald-400">
              <MessageCircle size={18} />
              {post.comments_count || 0}
            </button>

            <button
              onClick={() => sharePost(post.id)}
              disabled={sharingPost === post.id}
              className="flex items-center gap-1.5 hover:text-cyan-400"
            >
              {sharingPost === post.id ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
              {post.shares_count || 0}
            </button>
          </div>

          {showComments[post.id] && (
            <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
              {loadingComments[post.id] && (
                <div className="flex justify-center py-2 text-gray-400">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              )}

              {(commentsByPost[post.id] ?? []).map(comment => (
                <div key={comment.id} className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(comment.nome || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="bg-gray-800 rounded-xl px-3 py-2 flex-1">
                    <p className="text-sm text-white font-semibold">{comment.nome || 'Usuário'}</p>
                    <p className="text-sm text-gray-300">{comment.content}</p>
                  </div>
                </div>
              ))}

              {user && (
                <div className="flex gap-2">
                  <input
                    value={commentText[post.id] ?? ''}
                    onChange={e => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') addComment(post.id);
                    }}
                    placeholder="Escreve um comentário..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => addComment(post.id)}
                    className="px-3 py-2 bg-emerald-500 text-white rounded-xl"
                  >
                    <Send size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
