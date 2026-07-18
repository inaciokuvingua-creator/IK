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
const [sharingPost, setSharingPost] = useState<string | null>(null);
  const [deletingPost,setDeletingPost] = useState<string | null>(null);


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


    const formattedPosts = (postsData ?? []).map((post:any)=>({

      ...post,

      reactions_count:
        post.post_reactions?.[0]?.count ?? 0,

      comments_count:
        post.post_comments?.[0]?.count ?? 0,

      shares_count:
        post.post_shares?.[0]?.count ?? 0

    }));


    setPosts(formattedPosts);


  } catch(error){

    console.error(
      "Erro carregando feed:",
      error
    );

  } finally {

    setLoading(false);

  }
};
const sharePost = async (postId:string)=>{

  if(!user){
    alert("Faça login para compartilhar");
    return;
  }


  if(sharingPost === postId) return;


  setSharingPost(postId);


  try {


    const {data,error}=await supabase.rpc(
      "share_post",
      {
        p_post_id:postId,
        p_user_id:user.id,
        p_shared_to:"profile"
      }
    );


    if(error) throw error;


    console.log("Compartilhamento:",data);



    if(data?.action==="shared"){

      await load();

    }



    if(data?.action==="already_shared"){

      alert(
        "Você já compartilhou esta publicação"
      );

    }



  }catch(error){

    console.error(
      "share error",
      error
    );


  }finally{

    setSharingPost(null);

  }

};
  const deletePost = async (postId:string)=>{

  if(!user) return;


  const confirmDelete = window.confirm(
    "Tem certeza que deseja excluir esta publicação?"
  );


  if(!confirmDelete) return;


  setDeletingPost(postId);


  try{


    const {data,error}=await supabase.rpc(
      "delete_post",
      {
        p_post_id:postId,
        p_user_id:user.id
      }
    );


    if(error) throw error;


    console.log(
      "delete:",
      data
    );


    if(data?.action==="deleted"){

      setPosts(prev =>
        prev.filter(
          post=>post.id !== postId
        )
      );

    }


    if(data?.action==="not_owner"){

      alert(
        "Você não pode excluir esta publicação"
      );

    }


  }catch(error){

    console.error(
      "delete error:",
      error
    );


  }finally{

    setDeletingPost(null);

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
    await load();


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
  return (
  <div className="space-y-4">

    {posts.map((post) => {

      console.log("DEBUG DELETE", {
        loggedUser: user?.id,
        postOwner: post.user_id,
        postId: post.id
      });

      {posts.map((post) => {

console.log("DEBUG DELETE", {
  userId: user?.id,
  postUserId: post.user_id,
  igual: user?.id === post.user_id,
  post
});

return (
        <div
          key={post.id}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-4"
        >

          <div className="flex justify-between items-start">

            <div>
              <p className="text-white font-semibold">
                {post.nome || "Usuário"}
              </p>

              <p className="text-xs text-gray-500">
                {new Date(post.created_at).toLocaleDateString()}
              </p>
            </div>


            {user?.id === post.user_id && (

              <button
                onClick={() => deletePost(post.id)}
                disabled={deletingPost === post.id}
                className="text-red-500 hover:text-red-400 flex items-center gap-2"
              >

                {deletingPost === post.id ? (
                  <>
                    <Loader2 size={16} className="animate-spin"/>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <X size={16}/>
                    Excluir
                  </>
                )}

              </button>

            )}

          </div>


          <p className="text-white mt-4">
            {post.content}
          </p>


        </div>
      );

    })}

  </div>
);
          {user?.id === post.user_id && (

            <button
              onClick={() => deletePost(post.id)}
              disabled={deletingPost === post.id}
              className="text-red-500 hover:text-red-400 flex items-center gap-2"
            >

              {deletingPost === post.id ? (

                <>
                  <Loader2 size={16} className="animate-spin"/>
                  Excluindo...
                </>

              ) : (

                <>
                  <X size={16}/>
                  Excluir
                </>

              )}

            </button>

          )}

        </div>


        <p className="text-white mt-4">
          {post.content}
        </p>


        <div className="flex gap-5 mt-4 text-gray-400">

          <button>
            <Heart size={18}/>
            {post.reactions_count || 0}
          </button>


          <button onClick={() => loadComments(post.id)}>
            <MessageCircle size={18}/>
            {post.comments_count || 0}
          </button>


          <button onClick={() => sharePost(post.id)}>
            <Share2 size={18}/>
            {post.shares_count || 0}
          </button>

        </div>


      </div>

    ))}

  </div>
);
