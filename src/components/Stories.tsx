import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Plus, Type, Video as VideoIcon, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Profile = {
  user_id: string;
  nome: string | null;
  avatar_url: string | null;
};

type Story = {
  id: string;
  user_id: string;
  type: 'image' | 'video' | 'text';
  media_url: string | null;
  content: string | null;
  bg_color: string;
  font_size: number;
  expires_at: string;
  created_at: string;
  profile?: Profile;
  viewed?: boolean;
};

type StoryGroup = {
  user_id: string;
  nome: string;
  avatar_url: string | null;
  stories: Story[];
  allViewed: boolean;
};

const BG_COLORS = ['#1f2937', '#0f766e', '#7c2d12', '#7e22ce', '#1e40af', '#be123c', '#a16207'];
const MAX_VIDEO_MB = 50;

export default function Stories() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [creatorMode, setCreatorMode] = useState<'text' | 'image' | 'video'>('text');
  const [textContent, setTextContent] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<() => void>(() => {});

  const loadStories = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: storiesData, error } = await supabase
        .from('chat_stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });
      if (error) throw error;

      const stories = (storiesData ?? []) as Story[];
      const userIds = Array.from(new Set(stories.map((s) => s.user_id)));
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('user_profiles').select('user_id,nome,avatar_url').in('user_id', userIds)
        : { data: [] };
      const profileMap = new Map((profiles as Profile[] ?? []).map((p) => [p.user_id, p]));

      const myViewedIds = new Set<string>();
      if (userIds.length > 0) {
        const { data: myViews } = await supabase
          .from('chat_story_views')
          .select('story_id')
          .eq('viewer_id', user.id);
        (myViews ?? []).forEach((v: any) => myViewedIds.add(v.story_id));
      }

      const storiesWithMeta = stories.map((s) => ({
        ...s,
        profile: profileMap.get(s.user_id),
        viewed: myViewedIds.has(s.id),
      }));

      const grouped: StoryGroup[] = [];
      const byUser = new Map<string, Story[]>();
      storiesWithMeta.forEach((s) => {
        if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
        byUser.get(s.user_id)!.push(s);
      });
      byUser.forEach((storyList, uid) => {
        const p = profileMap.get(uid);
        grouped.push({
          user_id: uid,
          nome: p?.nome ?? 'Utilizador',
          avatar_url: p?.avatar_url ?? null,
          stories: storyList.sort((a, b) => a.created_at.localeCompare(b.created_at)),
          allViewed: storyList.every((s) => s.viewed),
        });
      });

      const mineFirst = grouped.sort((a, b) => {
        if (a.user_id === user.id) return -1;
        if (b.user_id === user.id) return 1;
        const aTime = a.stories[a.stories.length - 1]?.created_at ?? '';
        const bTime = b.stories[b.stories.length - 1]?.created_at ?? '';
        return bTime.localeCompare(aTime);
      });
      setGroups(mineFirst);
    } catch (e) {
      console.error('load stories error', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const recordView = useCallback(async (storyId: string) => {
    if (!user) return;
    try {
      await supabase.from('chat_story_views').upsert({ story_id: storyId, viewer_id: user.id }, { onConflict: 'story_id,viewer_id' });
    } catch (e) {
      console.error('record view', e);
    }
  }, [user]);

  const publish = async () => {
    if (!user) return;
    if (creatorMode === 'text' && !textContent.trim()) return;
    if ((creatorMode === 'image' || creatorMode === 'video') && !mediaFile) return;
    setPublishing(true);
    try {
      let mediaUrl: string | null = null;
      if ((creatorMode === 'image' || creatorMode === 'video') && mediaFile) {
        const ext = creatorMode === 'video'
          ? (mediaFile.name.split('.').pop()?.toLowerCase() || 'mp4')
          : mediaFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${user.id}/stories/${Date.now()}-${mediaFile.name.replace(/\s+/g, '_').replace(/\.[^.]+$/, '')}.${ext}`;
        const contentType = creatorMode === 'video'
          ? (mediaFile.type || 'video/mp4')
          : (mediaFile.type || 'image/jpeg');
        const { error } = await supabase.storage.from('chat-media').upload(path, mediaFile, { upsert: true, contentType });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);
        mediaUrl = publicUrl;
      }
      const { error } = await supabase.from('chat_stories').insert({
        user_id: user.id,
        type: creatorMode,
        media_url: mediaUrl,
        content: creatorMode === 'text' ? textContent.trim() : null,
        bg_color: creatorMode === 'text' ? bgColor : '#000000',
        font_size: 28,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
      setShowCreator(false);
      setTextContent('');
      setMediaFile(null);
      setMediaPreview(null);
      await loadStories();
    } catch (e) {
      console.error('publish story', e);
      alert('Não foi possível publicar a story.');
    } finally {
      setPublishing(false);
    }
  };

  // Story viewer logic
  const stopProgress = () => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  };

  const advance = useCallback((dir: 1 | -1) => {
    setViewingIndex((idx) => {
      if (!viewingGroup) return idx;
      const next = idx + dir;
      if (next < 0) return 0;
      if (next >= viewingGroup.stories.length) {
        stopProgress();
        setViewingGroup(null);
        return 0;
      }
      setProgress(0);
      return next;
    });
  }, [viewingGroup]);

  useEffect(() => { advanceRef.current = () => advance(1); }, [advance]);

  useEffect(() => {
    if (!viewingGroup) {
      stopProgress();
      setProgress(0);
      return;
    }
    const current = viewingGroup.stories[viewingIndex];
    if (!current) return;
    recordView(current.id);
    setProgress(0);
    stopProgress();
    // Vídeos usam a própria duração (15s de timeout como fallback); imagens/texto 5s
    const duration = current.type === 'video' ? 15000 : 5000;
    const tick = duration / 100;
    progressTimer.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          advanceRef.current();
          return 0;
        }
        return p + 1;
      });
    }, tick);
    return stopProgress;
  }, [viewingGroup, viewingIndex, recordView]);

  useEffect(() => () => stopProgress(), []);

  const myGroup = useMemo(() => groups.find((g) => g.user_id === user?.id) ?? null, [groups, user]);
  const otherGroups = useMemo(() => groups.filter((g) => g.user_id !== user?.id), [groups, user]);

  const openStory = (group: StoryGroup) => {
    setViewingGroup(group);
    setViewingIndex(0);
    setProgress(0);
  };

  const onPickMedia = (file: File | null) => {
    if (!file) { setMediaFile(null); setMediaPreview(null); return; }
    // Validação para vídeo
    if (creatorMode === 'video') {
      if (!file.type.startsWith('video/')) {
        alert('Por favor, escolhe um ficheiro de vídeo.');
        return;
      }
      if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
        alert(`O vídeo é muito grande. O máximo é ${MAX_VIDEO_MB}MB.`);
        return;
      }
    } else if (creatorMode === 'image') {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, escolhe um ficheiro de imagem.');
        return;
      }
    }
    setMediaFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setMediaPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Reset do media ao mudar de modo
  useEffect(() => {
    setMediaFile(null);
    setMediaPreview(null);
  }, [creatorMode]);

  const current = viewingGroup?.stories[viewingIndex] ?? null;

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-2 px-1">
        {/* Add / my story */}
        <button
          onClick={() => {
            if (myGroup && myGroup.stories.length > 0) openStory(myGroup);
            else { setCreatorMode('text'); setShowCreator(true); }
          }}
          className="flex flex-col items-center gap-1 shrink-0"
        >
          <div className="relative">
            <div className={`w-16 h-16 rounded-full p-[2px] ${myGroup && myGroup.stories.length > 0 ? (myGroup.allViewed ? 'bg-gray-600' : 'bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-400') : 'bg-gray-700'}`}>
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                {myGroup?.avatar_url
                  ? <img src={myGroup.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-white font-bold text-lg">{(user?.email?.[0] ?? 'U').toUpperCase()}</span>}
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-gray-900 flex items-center justify-center">
              <Plus size={12} className="text-white" />
            </span>
          </div>
          <span className="text-xs text-gray-400 max-w-[64px] truncate">{myGroup ? 'A minha' : 'Adicionar'}</span>
        </button>

        {loading && (
          <div className="flex items-center justify-center w-16 shrink-0">
            <Loader2 size={18} className="animate-spin text-gray-500" />
          </div>
        )}

        {otherGroups.map((group) => (
          <button key={group.user_id} onClick={() => openStory(group)} className="flex flex-col items-center gap-1 shrink-0">
            <div className={`w-16 h-16 rounded-full p-[2px] ${group.allViewed ? 'bg-gray-600' : 'bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-400'}`}>
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                {group.avatar_url
                  ? <img src={group.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-white font-bold text-lg">{group.nome[0]?.toUpperCase()}</span>}
              </div>
            </div>
            <span className="text-xs text-gray-400 max-w-[64px] truncate">{group.nome}</span>
          </button>
        ))}

        {!loading && groups.length === 0 && (
          <div className="flex items-center text-xs text-gray-600 py-8">Sem stories. Adiciona a primeira!</div>
        )}
      </div>

      {/* Creator modal */}
      {showCreator && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowCreator(false)}>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Nova story</h3>
              <button onClick={() => setShowCreator(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setCreatorMode('text')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm ${creatorMode === 'text' ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400'}`}
              ><Type size={14} /> Texto</button>
              <button
                onClick={() => setCreatorMode('image')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm ${creatorMode === 'image' ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400'}`}
              ><ImagePlus size={14} /> Imagem</button>
              <button
                onClick={() => setCreatorMode('video')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm ${creatorMode === 'video' ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400'}`}
              ><VideoIcon size={14} /> Vídeo</button>
            </div>

            {creatorMode === 'text' ? (
              <>
                <div className="rounded-xl flex items-center justify-center min-h-[200px] p-6 mb-3" style={{ backgroundColor: bgColor }}>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Escreve algo..."
                    maxLength={180}
                    className="w-full bg-transparent text-center text-white text-2xl font-semibold placeholder-white/60 focus:outline-none resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 mb-4">
                  {BG_COLORS.map((c) => (
                    <button key={c} onClick={() => setBgColor(c)} className={`w-7 h-7 rounded-full border-2 ${bgColor === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </>
            ) : (
              <div className="mb-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept={creatorMode === 'video' ? 'video/*' : 'image/*'}
                  className="hidden"
                  onChange={(e) => onPickMedia(e.target.files?.[0] ?? null)}
                />
                {mediaPreview ? (
                  <div className="relative">
                    {creatorMode === 'video' ? (
                      <video src={mediaPreview} controls className="w-full max-h-[300px] object-contain rounded-xl bg-black" />
                    ) : (
                      <img src={mediaPreview} alt="" className="w-full max-h-[300px] object-contain rounded-xl" />
                    )}
                    <button onClick={() => onPickMedia(null)} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white"><X size={14} /></button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} className="w-full h-44 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center text-gray-500 hover:border-emerald-500 hover:text-emerald-400">
                    {creatorMode === 'video' ? <VideoIcon size={28} /> : <ImagePlus size={28} />}
                    <span className="text-sm mt-2">{creatorMode === 'video' ? 'Escolher vídeo' : 'Escolher imagem'}</span>
                    {creatorMode === 'video' && <span className="text-xs text-gray-600 mt-1">Máx. {MAX_VIDEO_MB}MB · MP4, WebM, MOV</span>}
                  </button>
                )}
              </div>
            )}

            <button
              onClick={publish}
              disabled={publishing || (creatorMode === 'text' ? !textContent.trim() : !mediaFile)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2"
            >
              {publishing ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Publicar story
            </button>
          </div>
        </div>
      )}

      {/* Story viewer */}
      {viewingGroup && current && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={() => setViewingGroup(null)}>
          {/* Progress bars */}
          <div className="flex gap-1 p-3" onClick={(e) => e.stopPropagation()}>
            {viewingGroup.stories.map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
                <div className="h-full bg-white" style={{ width: i < viewingIndex ? '100%' : i === viewingIndex ? `${progress}%` : '0%' }} />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 px-4 py-2" onClick={(e) => e.stopPropagation()}>
            <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center text-white text-xs font-bold">
              {viewingGroup.avatar_url ? <img src={viewingGroup.avatar_url} alt="" className="w-full h-full object-cover" /> : viewingGroup.nome[0]?.toUpperCase()}
            </div>
            <span className="text-white text-sm font-medium">{viewingGroup.nome}</span>
            <span className="text-gray-500 text-xs ml-auto">{new Date(current.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div className="flex-1 relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* Tap zones */}
            <button onClick={() => advance(-1)} className="absolute left-0 top-0 bottom-0 w-1/3 z-10 flex items-start justify-start pl-2 pt-1/2">
              <ChevronLeft size={28} className="text-white/50" />
            </button>
            <button onClick={() => advance(1)} className="absolute right-0 top-0 bottom-0 w-1/3 z-10 flex items-end justify-end pr-2 pb-1/2">
              <ChevronRight size={28} className="text-white/50" />
            </button>

            {current.type === 'text' ? (
              <div className="w-full h-full flex items-center justify-center p-8" style={{ backgroundColor: current.bg_color }}>
                <p className="text-white text-center font-semibold" style={{ fontSize: current.font_size || 28 }}>{current.content}</p>
              </div>
            ) : current.type === 'image' ? (
              <img src={current.media_url ?? ''} alt="" className="max-w-full max-h-full object-contain" />
            ) : (
              <video
                src={current.media_url ?? ''}
                autoPlay
                playsInline
                controls
                onEnded={() => advance(1)}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>

          <button onClick={() => setViewingGroup(null)} className="absolute top-4 right-4 p-2 bg-black/40 rounded-full text-white z-20">
            <X size={20} />
          </button>
        </div>
      )}
    </>
  );
}
