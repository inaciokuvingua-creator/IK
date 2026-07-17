import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Send, Heart, MessageCircle, Share2, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';

type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  author_nome: string | null;
  author_avatar: string | null;
  likes_count: number;
  created_at: string;
  updated_at: string;
};

type Post = {
  id: string;
  user_id: string;
  content: string;
  title?: string;
  created_at: string;
  author_nome?: string;
  author_avatar?: string;
  reactions_count: number;
  comments_count: number;
  shares_count: number;
  user_reaction?: string | null;
};

const REACTION_EMOJIS: Record<string, { emoji: string; label: string; color: string }> = {
  like: { emoji: '👍', label: 'Gostar', color: 'text-blue-400' },
  love: { emoji: '❤️', label: 'Adorar', color: 'text-red-400' },
  laugh: { emoji: '😂', label: 'Rir', color: 'text-yellow-400' },
  wow: { emoji: '😮', label: 'Uau', color: 'text-orange-400' },
  sad: { emoji: '😢', label: 'Triste', color: 'text-blue-300' },
  angry: { emoji: '😡', label: 'Irritado', color: 'text-red-500' },
};

export default function CommunityFeed({ query }: { query?: string }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          reactions_count:post_reactions(count),
          comments_count:post_comments(count),
          shares_count:post_shares(count)
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      if (postsError) throw postsError;

      const postsWithReactions = await Promise.all((postsData ?? []).map(async (post: any) => {
        let userReaction = null;
        if (user) {
          const { data: reactionData } = await supabase
            .from('post_reactions')
            .select('reaction_type')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .maybeSingle();
          userReaction = reactionData?.reaction_type ?? null;
        }
        return {
          ...post,
          reactions_count: post.reactions_count?.[0]?.count ?? 0,
          comments_count: post.comments_count?.[0]?.count ?? 0,
          shares_count: post.shares_count?.[0]?.count ?? 0,
          user_reaction: userReaction,
        };
      }));

      setPosts(postsWithReactions);
    } catch (e) {
      console.error('feed load', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    const channel = supabase.channel('posts-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const newPost = payload.new as Post;
        setPosts(prev => [newPost, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handlePost = async () => {
    if (!text.trim() || !user) return;
    setPosting(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: text.trim(),
          author_nome: profile?.display_name ?? profile?.nome ?? user.email?.split('@')[0],
          author_avatar: profile?.avatar_url ?? null,
        })
        .select()
        .single();

      if (error) { alert(error.message); return; }
      if (data) { setPosts(prev => [{ ...data, reactions_count: 0, comments_count: 0, shares_count: 0, user_reaction: null }, ...prev]); }
      setText('');
    } catch (e) { console.error('post error', e); alert('Erro ao publicar'); }
    finally { setPosting(false); }
  };

  const toggleReaction = async (postId: string, reactionType: string = 'like') => {
    if (!user) { alert('Faça login para reagir'); return; }
    try {
      const { data, error } = await supabase.rpc('toggle_post_reaction', {
        p_post_id: postId, p_user_id: user.id, p_reaction_type: reactionType,
      });
      if (error) throw error;

      setPosts(prev => prev.map(post => {
        if (post.id !== postId) return post;
        const action = data?.action;
        if (action === 'added') {
          return { ...post, reactions_count: (post.reactions_count || 0) + 1, user_reaction: reactionType };
        } else if (action === 'removed') {
          return { ...post, reactions_count: Math.max(0, (post.reactions_count || 0) - 1), user_reaction: null };
        }
        return post;
      }));
      setShowReactionPicker(null);
    } catch (e) { console.error('reaction error', e); }
  };

  const loadComments = async (postId: string) => {
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const { data, error } = await supabase.from('post_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
      if (error) throw error;
      setCommentsByPost(prev => ({ ...prev, [postId]: data ?? [] }));
    } catch (e) { console.error('load comments error', e); }
    finally { setLoadingComments(prev => ({ ...prev, [postId]: false })); }
  };

  const addComment = async (postId: string) => {
    if (!user || !commentText[postId]?.trim()) return;
    try {
      const { data: commentId, error } = await supabase.rpc('add_post_comment', {
        p_post_id: postId, p_user_id: user.id, p_content: commentText[postId].trim(),
        p_author_nome: profile?.display_name ?? profile?.nome ?? user.email?.split('@')[0],
        p_author_avatar: profile?.avatar_url ?? null,
      });
      if (error) throw error;
      await loadComments(postId);
      setPosts(prev => prev.map(post => post.id === postId ? { ...post, comments_count: (post.comments_count || 0) + 1 } : post));
      setCommentText(prev => ({ ...prev, [postId]: '' }));
    } catch (e) { console.error('add comment error', e); }
  };

  const sharePost = async (postId: string) => {
    if (!user) { alert('Faça login para compartilhar'); return; }
    try {
      const { data, error } = await supabase.rpc('share_post', {
        p_post_id: postId, p_user_id: user.id, p_shared_to: 'feed',
      });
      if (error) throw error;
      if (data?.action === 'shared') {
        setPosts(prev => prev.map(post => post.id === postId ? { ...post, shares_count: (post.shares_count || 0) + 1 } : post));
      }
    } catch (e) { console.error('share error', e); }
  };

  const toggleComments = async (postId: string) => {
    const isShowing = showComments[postId];
    setShowComments(prev => ({ ...prev, [postId]: !isShowing }));
    if (!isShowing && !commentsByPost[postId]) { await loadComments(postId); }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
              {(profile?.display_name ?? profile?.nome ?? 'U')[0]?.toUpperCase()}
            </div>
          )}
          <textarea placeholder="Partilhe algo com a comunidade..." value={text} onChange={e => setText(e.target.value)} rows={3}
            className="flex-1 bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-emerald-700 placeholder-gray-600" />
        </div>
        <div className="flex justify-end">
          <button onClick={handlePost} disabled={!text.trim() || posting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publicar
          </button>
        </div>
      </div>

      {loading && posts.length === 0 ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="text-emerald-500 animate-spin" /></div>
      ) : posts.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <MessageCircle size={28} className="text-gray-700 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Nenhuma publicação ainda. Seja o primeiro!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const hasReaction = !!post.user_reaction;
            const reactionInfo = post.user_reaction ? REACTION_EMOJIS[post.user_reaction] : null;
            return (
              <div key={post.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  {post.author_avatar ? (
                    <img src={post.author_avatar} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
                      {(post.author_nome ?? 'U')[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{post.author_nome ?? 'Utilizador'}</span>
                      <span className="text-xs text-gray-600">{formatDate(post.created_at)}</span>
                    </div>
                    {post.title && <p className="text-sm font-semibold text-white mt-1">{post.title}</p>}
                    <p className="text-sm text-gray-300 mt-1 leading-relaxed">{post.content}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 ml-12 relative">
                  <div className="relative">
                    <button onClick={() => setShowReactionPicker(showReactionPicker === post.id ? null : post.id)}
                      className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors ${hasReaction ? reactionInfo?.color : 'text-gray-500 hover:text-red-400'}`}>
                      {hasReaction ? <span className="text-sm">{reactionInfo?.emoji}</span> : <Heart size={13} />}
                      <span className={hasReaction ? 'font-medium' : ''}>{hasReaction ? reactionInfo?.label : 'Gostar'}{post.reactions_count > 0 && ` (${post.reactions_count})`}</span>
                    </button>
                    {showReactionPicker === post.id && (
                      <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-700 rounded-xl p-2 shadow-xl flex gap-1 z-50">
                        {Object.entries(REACTION_EMOJIS).map(([type, info]) => (
                          <button key={type} onClick={() => toggleReaction(post.id, type)}
                            className={`text-xl p-1.5 rounded-lg hover:bg-gray-700 transition-colors ${post.user_reaction === type ? 'bg-gray-700 ring-2 ring-emerald-500' : ''}`} title={info.label}>{info.emoji}</button>
                        ))}
                        <button onClick={() => setShowReactionPicker(null)} className="text-gray-500 hover:text-white p-1.5"><X size={14} /></button>
                      </div>
                    )}
                  </div>
                  <button onClick={() => toggleComments(post.id)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-400 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                    <MessageCircle size={13} /> Comentar{post.comments_count > 0 && ` (${post.comments_count})`}
                  </button>
                  <button onClick={() => sharePost(post.id)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-400 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                    <Share2 size={13} /> Partilhar{post.shares_count > 0 && ` (${post.shares_count})`}
                  </button>
                </div>

                {showComments[post.id] && (
                  <div className="mt-3 ml-12 border-t border-gray-800 pt-3 space-y-3">
                    {loadingComments[post.id] ? (
                      <div className="flex justify-center py-2"><Loader2 size={16} className="text-emerald-500 animate-spin" /></div>
                    ) : (
                      <>
                        {commentsByPost[post.id]?.length === 0 ? (
                          <p className="text-gray-600 text-xs text-center py-2">Nenhum comentário ainda</p>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {commentsByPost[post.id]?.map(comment => (
                              <div key={comment.id} className="flex items-start gap-2 p-2 bg-gray-800/50 rounded-xl">
                                {comment.author_avatar ? (
                                  <img src={comment.author_avatar} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-bold text-xs shrink-0">{(comment.author_nome ?? 'U')[0]?.toUpperCase()}</div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-white">{comment.author_nome ?? 'Utilizador'}</span>
                                    <span className="text-[10px] text-gray-600">{formatDate(comment.created_at)}</span>
                                  </div>
                                  <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{comment.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">{(profile?.display_name ?? profile?.nome ?? 'U')[0]?.toUpperCase()}</div>
                          )}
                          <div className="flex-1 flex gap-2">
                            <input value={commentText[post.id] ?? ''} onChange={e => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addComment(post.id)} placeholder="Escreva um comentário..."
                              className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors" />
                            <button onClick={() => addComment(post.id)} disabled={!commentText[post.id]?.trim()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-3 py-2 rounded-xl text-xs transition-colors"><Send size={12} /></button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
