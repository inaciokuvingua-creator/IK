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
  nome: string | null;
  username: string | null;
  avatar_url: string | null;
  likes_count: number;
  replies_count?: number;
  created_at: string;
  updated_at: string;
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
  const [sharingPost, setSharingPost] = useState<string | null>(null);
const sharePost = async (postId: string) => {
  if (!user) {
    alert('Faça login para compartilhar');
    return;
  }

  if (sharingPost === postId) return;

  setSharingPost(postId);

  try {
    const { data, error } = await supabase.rpc(
      'share_post',
      {
        p_post_id: postId,
        p_user_id: user.id,
        p_shared_to: 'profile'
      }
    );

    if (error) throw error;

    console.log('share result:', data);

    if (data?.action === 'shared') {

      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                shares_count:
                  (post.shares_count || 0) + 1
              }
            : post
        )
      );

    }

  } catch (e) {

    console.error(
      'share error',
      e
    );

  } finally {

    setSharingPost(null);

  }
};

  const loadComments = async (postId: string) => {
    setLoadingComments(prev => ({
      ...prev,
      [postId]: true
    }));

    try {

      const { data, error } = await supabase.rpc(
        'get_post_comments',
        {
          p_post_id: postId
        }
      );


      if (error) throw error;


      setCommentsByPost(prev => ({
        ...prev,
        [postId]: (data ?? []) as PostComment[]
      }));


    } catch (e) {

      console.error(
        'load comments error',
        e
      );

    } finally {

      setLoadingComments(prev => ({
        ...prev,
        [postId]: false
      }));

    }
  };


 const addComment = async (postId: string) => {

  if (!user || !commentText[postId]?.trim()) return;

  try {

    const { error } = await supabase.rpc(
      'add_post_comment',
      {
        p_post_id: postId,
        p_user_id: user.id,
        p_content: commentText[postId].trim()
      }
    );


    if (error) throw error;


    await loadComments(postId);


    setPosts(prev =>
      prev.map(post =>
        post.id === postId
          ? {
              ...post,
              comments_count:
                (post.comments_count || 0) + 1
            }
          : post
      )
    );


    setCommentText(prev => ({
      ...prev,
      [postId]: ''
    }));


  } catch (e) {

    console.error(
      'add comment error',
      e
    );

  }
};
