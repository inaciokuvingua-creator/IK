import {
  useEffect, useRef, useState, useCallback, ChangeEvent,
} from 'react';
import {
  Search, Plus, Send, Paperclip, Mic, Video, Phone, MoreVertical,
  X, Check, CheckCheck, ArrowLeft, Image as ImageIcon, File as FileIcon,
  Smile, Sticker, Reply, Edit3, Trash2, Users, UserPlus, Camera,
  PhoneCall, PhoneOff, PhoneMissed, VideoOff, Mic as MicIcon, MicOff,
  MonitorDot, Volume2, VolumeX, PlusCircle, Eye, Play, Pause,
  Download, ZoomIn, ChevronLeft, ChevronRight, Clock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  type Conversation, type ConvParticipant, type ChatMessage, type ChatReaction,
  type ChatStory, type ChatCall, type Profile,
  STICKERS, QUICK_REACTIONS,
  formatMsgTime, formatDuration, formatFileSize,
} from './chat-types';

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ profile, size = 'md', online }: { profile?: Profile | null; size?: 'xs' | 'sm' | 'md' | 'lg'; online?: boolean }) {
  const sz = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-14 h-14 text-xl' }[size];
  const dotSz = { xs: 'w-1.5 h-1.5', sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' }[size];
  const initial = (profile?.nome ?? '?')[0].toUpperCase();
  return (
    <div className="relative shrink-0">
      <div className={`${sz} rounded-full bg-gray-700 flex items-center justify-center overflow-hidden font-semibold text-gray-300`}>
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          : initial}
      </div>
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 ${dotSz} rounded-full border-2 border-gray-900 ${online ? 'bg-emerald-400' : 'bg-gray-600'}`} />
      )}
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────────
function MessageBubble({
  msg, mine, profile, onReact, onReply, onEdit, onDelete, allProfiles,
}: {
  msg: ChatMessage; mine: boolean; profile?: Profile | null;
  onReact: (msgId: string, emoji: string) => void;
  onReply: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onDelete: (msgId: string) => void;
  allProfiles: Record<string, Profile>;
}) {
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (msg.deleted_at) {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-1`}>
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl px-4 py-2 italic text-gray-600 text-sm flex items-center gap-2">
          <Trash2 size={12} /> Mensagem apagada
        </div>
      </div>
    );
  }

  const grouped = msg.reactions?.reduce<Record<string, { count: number; mine: boolean }>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false };
    acc[r.emoji].count++;
    return acc;
  }, {}) ?? {};

  const renderContent = () => {
    switch (msg.type) {
      case 'image':
        return (
          <a href={msg.media_url!} target="_blank" rel="noopener noreferrer">
            <img src={msg.media_url!} alt="" className="max-w-[240px] rounded-xl cursor-zoom-in object-cover" />
          </a>
        );
      case 'video':
        return (
          <video src={msg.media_url!} controls className="max-w-[240px] rounded-xl" />
        );
      case 'audio':
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <audio ref={audioRef} src={msg.media_url!}
              onTimeUpdate={() => {
                const a = audioRef.current;
                if (a) setAudioProgress(a.currentTime / a.duration * 100);
              }}
              onEnded={() => { setAudioPlaying(false); setAudioProgress(0); }}
            />
            <button
              onClick={() => {
                const a = audioRef.current;
                if (!a) return;
                if (audioPlaying) { a.pause(); setAudioPlaying(false); }
                else { a.play(); setAudioPlaying(true); }
              }}
              className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/30 transition-colors shrink-0"
            >
              {audioPlaying ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <div className="flex-1">
              <div className="h-1 bg-gray-600 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 transition-all" style={{ width: `${audioProgress}%` }} />
              </div>
              <p className="text-gray-500 text-xs mt-1">
                {msg.media_duration ? formatDuration(msg.media_duration) : ''}
              </p>
            </div>
            <MicIcon size={14} className="text-gray-500 shrink-0" />
          </div>
        );
      case 'file':
        return (
          <a href={msg.media_url!} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 min-w-[180px] hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center shrink-0">
              <FileIcon size={18} className="text-gray-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{msg.media_name ?? 'Ficheiro'}</p>
              <p className="text-gray-500 text-xs">
                {msg.media_size ? formatFileSize(msg.media_size) : ''} · Download
              </p>
            </div>
            <Download size={14} className="text-gray-500 shrink-0" />
          </a>
        );
      case 'sticker':
        return <span className="text-5xl select-none">{msg.sticker_id}</span>;
      case 'call_log':
        return (
          <div className="flex items-center gap-2 text-sm">
            {msg.call_status === 'missed'
              ? <PhoneMissed size={15} className="text-red-400" />
              : msg.call_type?.includes('video')
                ? <Video size={15} className="text-emerald-400" />
                : <Phone size={15} className="text-emerald-400" />}
            <span className="text-gray-300">
              {msg.call_status === 'missed' ? 'Chamada perdida' : `Chamada — ${msg.call_duration ? formatDuration(msg.call_duration) : ''}`}
            </span>
          </div>
        );
      default:
        return (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {msg.content}
            {msg.edited && <span className="text-gray-600 text-xs ml-1">(editado)</span>}
          </p>
        );
    }
  };

  return (
    <div className={`group flex ${mine ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 mb-2`}>
      {!mine && <Avatar profile={profile} size="sm" />}

      <div className={`relative max-w-[72%]`}>
        {/* Reply preview */}
        {msg.reply_to_id && msg.reply_to && (
          <div className={`text-xs rounded-t-xl px-3 py-1.5 border-l-2 border-emerald-500 mb-0.5 ${mine ? 'bg-gray-700/60 text-right' : 'bg-gray-700/60'}`}>
            <span className="text-emerald-400 font-medium">
              {allProfiles[msg.reply_to.sender_id]?.nome ?? ''}
            </span>
            <p className="text-gray-400 truncate">{msg.reply_to.content ?? '...'}</p>
          </div>
        )}

        <div
          className={`relative rounded-2xl px-4 py-2.5 ${
            msg.type === 'sticker' ? 'bg-transparent' :
            mine
              ? 'bg-emerald-600 text-white rounded-br-sm'
              : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-bl-sm'
          }`}
          onMouseEnter={() => setShowReactions(true)}
          onMouseLeave={() => { setShowReactions(false); setShowMenu(false); }}
        >
          {renderContent()}

          {/* Timestamp + read */}
          {msg.type !== 'sticker' && (
            <div className={`flex items-center gap-1 mt-1 ${mine ? 'justify-end' : 'justify-start'}`}>
              <span className="text-[10px] text-white/50">{formatMsgTime(msg.created_at)}</span>
              {mine && <CheckCheck size={12} className="text-white/60" />}
            </div>
          )}

          {/* Hover toolbar */}
          {showReactions && msg.type !== 'deleted' && (
            <div className={`absolute ${mine ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} bottom-0 flex items-center gap-0.5 bg-gray-900 border border-gray-700 rounded-2xl px-2 py-1.5 shadow-2xl z-10 ml-1 mr-1`}>
              {QUICK_REACTIONS.map(e => (
                <button key={e} onClick={() => onReact(msg.id, e)}
                  className="text-base hover:scale-125 transition-transform px-0.5">{e}</button>
              ))}
              <div className="w-px h-4 bg-gray-700 mx-0.5" />
              <button onClick={() => onReply(msg)} className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg" title="Responder">
                <Reply size={13} />
              </button>
              {mine && msg.type === 'text' && (
                <button onClick={() => onEdit(msg)} className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg" title="Editar">
                  <Edit3 size={13} />
                </button>
              )}
              {mine && (
                <button onClick={() => { onDelete(msg.id); setShowMenu(false); }}
                  className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg" title="Apagar">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Reactions row */}
        {Object.keys(grouped).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${mine ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(grouped).map(([emoji, { count }]) => (
              <button key={emoji}
                onClick={() => onReact(msg.id, emoji)}
                className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-full px-2 py-0.5 text-xs hover:border-emerald-600 transition-colors">
                <span>{emoji}</span>
                <span className="text-gray-400">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Story ring ─────────────────────────────────────────────────────────────────
function StoryRing({ story, viewed, onClick }: { story: ChatStory; viewed: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 shrink-0 group">
      <div className={`p-0.5 rounded-full ${viewed ? 'bg-gray-700' : 'bg-gradient-to-tr from-emerald-400 to-blue-500'}`}>
        <div className="p-0.5 rounded-full bg-gray-900">
          <Avatar profile={story.profile} size="md" />
        </div>
      </div>
      <span className="text-gray-400 text-xs truncate w-14 text-center group-hover:text-white transition-colors">
        {story.profile?.nome?.split(' ')[0] ?? ''}
      </span>
    </button>
  );
}

// ── Story viewer ───────────────────────────────────────────────────────────────
function StoryViewer({ stories, startIndex, onClose }: { stories: ChatStory[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const story = stories[idx];
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setProgress(0);
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          if (idx < stories.length - 1) setIdx(i => i + 1);
          else onClose();
          return 0;
        }
        return p + (story.type === 'video' ? 0.5 : 2);
      });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [idx]);

  if (!story) return null;

  return (
    <div className="fixed inset-0 bg-black z-[9000] flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full max-w-sm h-full max-h-[90vh] rounded-2xl overflow-hidden bg-gray-900"
        onClick={e => e.stopPropagation()}>
        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all"
                style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }} />
            </div>
          ))}
        </div>
        {/* Header */}
        <div className="absolute top-7 left-3 right-3 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar profile={story.profile} size="sm" />
            <div>
              <p className="text-white text-sm font-semibold">{story.profile?.nome}</p>
              <p className="text-white/60 text-xs">{formatMsgTime(story.created_at)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 bg-black/30 rounded-full text-white/80 hover:text-white">
            <X size={16} />
          </button>
        </div>
        {/* Story content */}
        <div className="w-full h-full flex items-center justify-center"
          style={{ background: story.bg_color }}>
          {story.type === 'image' && story.media_url && (
            <img src={story.media_url} alt="" className="w-full h-full object-contain" />
          )}
          {story.type === 'video' && story.media_url && (
            <video src={story.media_url} autoPlay muted loop className="w-full h-full object-contain" />
          )}
          {story.type === 'text' && (
            <p className="text-white font-bold text-center px-8 leading-tight"
              style={{ fontSize: story.font_size }}>{story.content}</p>
          )}
        </div>
        {/* Navigation */}
        <button onClick={() => setIdx(i => Math.max(0, i - 1))}
          className="absolute left-0 top-0 bottom-0 w-1/3 z-10" />
        <button onClick={() => { if (idx < stories.length - 1) setIdx(i => i + 1); else onClose(); }}
          className="absolute right-0 top-0 bottom-0 w-1/3 z-10" />
      </div>
    </div>
  );
}

// ── In-call overlay ────────────────────────────────────────────────────────────
function CallOverlay({
  call, myStream, peerStream, onEnd, onMuteToggle, onVideoToggle,
  muted, videoOff,
}: {
  call: ChatCall; myStream: MediaStream | null; peerStream: MediaStream | null;
  onEnd: () => void; onMuteToggle: () => void; onVideoToggle: () => void;
  muted: boolean; videoOff: boolean;
}) {
  const myVideoRef  = useRef<HTMLVideoElement>(null);
  const peerVideoRef = useRef<HTMLVideoElement>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (myStream && myVideoRef.current) {
      myVideoRef.current.srcObject = myStream;
    }
  }, [myStream]);

  useEffect(() => {
    if (peerStream && peerVideoRef.current) {
      peerVideoRef.current.srcObject = peerStream;
    }
  }, [peerStream]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const isVideo = call.call_type.includes('video');

  return (
    <div className="fixed inset-0 bg-black z-[8000] flex flex-col">
      {isVideo ? (
        <>
          <video ref={peerVideoRef} autoPlay playsInline className="flex-1 w-full object-cover bg-gray-900" />
          <video ref={myVideoRef} autoPlay playsInline muted
            className="absolute bottom-28 right-4 w-28 h-40 rounded-2xl object-cover border-2 border-white/20 shadow-2xl" />
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-900">
          <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center">
            <Phone size={36} className="text-gray-300" />
          </div>
          <p className="text-white text-2xl font-semibold">Chamada de voz</p>
          <p className="text-gray-400 text-lg">{formatDuration(elapsed)}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 py-8 bg-gray-900/90 backdrop-blur">
        <button onClick={onMuteToggle}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
          {muted ? <MicOff size={22} className="text-white" /> : <MicIcon size={22} className="text-white" />}
        </button>
        {isVideo && (
          <button onClick={onVideoToggle}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${videoOff ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
            {videoOff ? <VideoOff size={22} className="text-white" /> : <Video size={22} className="text-white" />}
          </button>
        )}
        <button onClick={onEnd}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-2xl transition-colors">
          <PhoneOff size={26} className="text-white" />
        </button>
        {isVideo && (
          <button className="w-14 h-14 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors">
            <MonitorDot size={22} className="text-white" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Chat component ────────────────────────────────────────────────────────
export default function Chat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [stories, setStories]       = useState<ChatStory[]>([]);
  const [text, setText]             = useState('');
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [sending, setSending]       = useState(false);
  const [replyTo, setReplyTo]       = useState<ChatMessage | null>(null);
  const [editMsg, setEditMsg]       = useState<ChatMessage | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [showAddChat, setShowAddChat]   = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState<{ stories: ChatStory[]; idx: number } | null>(null);
  const [showNewStory, setShowNewStory] = useState(false);
  const [storyText, setStoryText]   = useState('');
  const [storyBg, setStoryBg]       = useState('#1f2937');
  const [newEmail, setNewEmail]     = useState('');
  const [groupName, setGroupName]   = useState('');
  const [groupEmails, setGroupEmails] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [allProfiles, setAllProfiles] = useState<Record<string, Profile>>({});
  const [activeCall, setActiveCall] = useState<ChatCall | null>(null);
  const [myStream, setMyStream]     = useState<MediaStream | null>(null);
  const [muted, setMuted]           = useState(false);
  const [videoOff, setVideoOff]     = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const scrollToBottom = () => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); };

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    if (allProfiles[userId]) return allProfiles[userId];
    const { data } = await supabase.from('user_profiles').select('user_id,nome,avatar_url,verified,plan').eq('user_id', userId).maybeSingle();
    if (data) {
      setAllProfiles(p => ({ ...p, [data.user_id]: data as Profile }));
      return data as Profile;
    }
    return null;
  }, [allProfiles]);

  // ── Load conversations ─────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: parts } = await supabase
      .from('chat_participants')
      .select('conversation_id')
      .eq('user_id', user.id)
      .is('left_at', null);

    const convIds = (parts ?? []).map(p => p.conversation_id);
    if (!convIds.length) { setConversations([]); setLoading(false); return; }

    const { data: convs } = await supabase
      .from('chat_conversations')
      .select('*')
      .in('id', convIds)
      .order('updated_at', { ascending: false });

    if (!convs) { setConversations([]); setLoading(false); return; }

    const enriched: Conversation[] = await Promise.all(convs.map(async conv => {
      // Load participants + their profiles
      const { data: pList } = await supabase.from('chat_participants').select('*').eq('conversation_id', conv.id).is('left_at', null);
      const participants = pList ?? [];
      for (const p of participants) {
        await fetchProfile(p.user_id);
      }

      // Last message
      const { data: lastMsgs } = await supabase.from('chat_messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(1);
      const lastMessage = lastMsgs?.[0] ?? null;

      // Unread
      const me = participants.find(p => p.user_id === user.id);
      const unread = me ? (await supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('conversation_id', conv.id).neq('sender_id', user.id).gt('created_at', me.last_read_at ?? '1970-01-01')).count ?? 0 : 0;

      return { ...conv, participants: participants as ConvParticipant[], lastMessage, unreadCount: unread } as Conversation;
    }));

    setConversations(enriched);
    setLoading(false);
  }, [user, fetchProfile]);

  // ── Load messages ──────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(100);

    const msgs = data ?? [];

    // Enrich with sender profiles, reactions, reply previews
    const enriched: ChatMessage[] = await Promise.all(msgs.map(async msg => {
      const sender = await fetchProfile(msg.sender_id);
      const { data: reactions } = await supabase.from('chat_reactions').select('*').eq('message_id', msg.id);
      let reply_to: ChatMessage | null = null;
      if (msg.reply_to_id) {
        const { data: rMsg } = await supabase.from('chat_messages').select('*').eq('id', msg.reply_to_id).maybeSingle();
        reply_to = rMsg as ChatMessage | null;
      }
      return { ...msg, sender: sender ?? undefined, reactions: reactions ?? [], reply_to } as ChatMessage;
    }));

    setMessages(enriched);

    // Mark as read
    await supabase.from('chat_participants').update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', convId).eq('user_id', user!.id);

    setTimeout(scrollToBottom, 100);
  }, [fetchProfile, user]);

  // ── Load stories ───────────────────────────────────────────────────────────
  const loadStories = useCallback(async () => {
    const { data } = await supabase
      .from('chat_stories')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    const enriched: ChatStory[] = await Promise.all((data ?? []).map(async s => {
      const profile = await fetchProfile(s.user_id);
      const { count } = await supabase.from('chat_story_views').select('id', { count: 'exact', head: true }).eq('story_id', s.id);
      const { data: myView } = await supabase.from('chat_story_views').select('id').eq('story_id', s.id).eq('viewer_id', user!.id).maybeSingle();
      return { ...s, profile: profile ?? undefined, view_count: count ?? 0, viewed: !!myView } as ChatStory;
    }));

    // Group by user — my stories first
    const mine = enriched.filter(s => s.user_id === user!.id);
    const others = enriched.filter(s => s.user_id !== user!.id);
    setStories([...mine, ...others]);
  }, [fetchProfile, user]);

  // ── Realtime subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !activeConv) return;

    const ch = supabase.channel(`chat:${activeConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `conversation_id=eq.${activeConv.id}`,
      }, async (payload) => {
        const msg = payload.new as ChatMessage;
        const sender = await fetchProfile(msg.sender_id);
        const { data: reactions } = await supabase.from('chat_reactions').select('*').eq('message_id', msg.id);
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, { ...msg, sender: sender ?? undefined, reactions: reactions ?? [] }];
        });
        setTimeout(scrollToBottom, 50);
        // Mark read
        await supabase.from('chat_participants').update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', activeConv.id).eq('user_id', user.id);
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_reactions',
      }, (payload) => {
        const r = payload.new as ChatReaction;
        setMessages(prev => prev.map(m =>
          m.id === r.message_id ? { ...m, reactions: [...(m.reactions ?? []).filter(x => !(x.user_id === r.user_id && x.emoji === r.emoji)), r] } : m
        ));
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'chat_reactions',
      }, (payload) => {
        const r = payload.old as ChatReaction;
        setMessages(prev => prev.map(m =>
          m.id === r.message_id ? { ...m, reactions: (m.reactions ?? []).filter(x => x.id !== r.id) } : m
        ));
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'chat_messages',
        filter: `conversation_id=eq.${activeConv.id}`,
      }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chat_typing',
        filter: `conversation_id=eq.${activeConv.id}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setTypingUsers(s => { const ns = new Set(s); ns.delete((payload.old as any).user_id); return ns; });
        } else {
          const t = payload.new as any;
          if (t.user_id !== user.id) {
            setTypingUsers(s => new Set([...s, t.user_id]));
            setTimeout(() => setTypingUsers(s => { const ns = new Set(s); ns.delete(t.user_id); return ns; }), 4000);
          }
        }
      })
      .subscribe();

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [user, activeConv?.id]);

  // Calls realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('calls:' + user.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_calls',
      }, async (payload) => {
        const call = payload.new as ChatCall;
        if (call.participants.includes(user.id) && call.caller_id !== user.id) {
          // Incoming call notification — auto-answer for demo
          setActiveCall(call);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => { if (user) { loadConversations(); loadStories(); } }, [user]);
  useEffect(() => { if (activeConv) loadMessages(activeConv.id); }, [activeConv?.id]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = async (
    type: ChatMessage['type'] = 'text',
    extra: Partial<ChatMessage> = {},
  ) => {
    if (!activeConv || !user) return;
    const content = text.trim();
    if (type === 'text' && !content && !editMsg) return;

    setSending(true);
    clearTyping();

    if (editMsg) {
      await supabase.from('chat_messages').update({ content, edited: true }).eq('id', editMsg.id);
      setMessages(prev => prev.map(m => m.id === editMsg.id ? { ...m, content, edited: true } : m));
      setEditMsg(null);
    } else {
      const payload = {
        conversation_id: activeConv.id,
        type,
        content: content || null,
        reply_to_id: replyTo?.id ?? null,
        ...extra,
      };
      await supabase.from('chat_messages').insert(payload);
      // Update conversation updated_at
      await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConv.id);
    }

    setText('');
    setReplyTo(null);
    setShowStickers(false);
    setSending(false);
  };

  // ── Typing indicator ───────────────────────────────────────────────────────
  const sendTyping = async () => {
    if (!activeConv || !user) return;
    await supabase.from('chat_typing').upsert({ user_id: user.id, conversation_id: activeConv.id, updated_at: new Date().toISOString() });
  };

  const clearTyping = async () => {
    if (!activeConv || !user) return;
    await supabase.from('chat_typing').delete().eq('user_id', user.id).eq('conversation_id', activeConv.id);
  };

  const handleTextChange = (v: string) => {
    setText(v);
    sendTyping();
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(clearTyping, 3000);
  };

  // ── React to message ───────────────────────────────────────────────────────
  const handleReact = async (msgId: string, emoji: string) => {
    if (!user) return;
    const existing = messages.find(m => m.id === msgId)?.reactions?.find(r => r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      await supabase.from('chat_reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('chat_reactions').insert({ message_id: msgId, emoji });
    }
  };

  // ── Delete message ─────────────────────────────────────────────────────────
  const handleDelete = async (msgId: string) => {
    await supabase.from('chat_messages').update({ deleted_at: new Date().toISOString(), type: 'deleted', content: null }).eq('id', msgId);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deleted_at: new Date().toISOString(), type: 'deleted' as const } : m));
  };

  // ── Upload media ───────────────────────────────────────────────────────────
  const uploadMedia = async (file: File) => {
    if (!user || !activeConv) return;
    setMediaUploading(true);
    setUploadProgress(0);

    const ext  = file.name.split('.').pop() ?? 'bin';
    const path = `${user.id}/${activeConv.id}/${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage.from('chat-media').upload(path, file, { upsert: false });

    if (error || !data) { setMediaUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);

    const mime = file.type;
    let type: ChatMessage['type'] = 'file';
    if (mime.startsWith('image/')) type = 'image';
    else if (mime.startsWith('audio/')) type = 'audio';
    else if (mime.startsWith('video/')) type = 'video';

    let duration: number | null = null;
    if (type === 'audio' || type === 'video') {
      duration = await getMediaDuration(file);
    }

    await sendMessage(type, {
      media_url: publicUrl,
      media_mime: mime,
      media_name: file.name,
      media_size: file.size,
      media_duration: duration,
    });

    setMediaUploading(false);
    setUploadProgress(0);
  };

  const getMediaDuration = (file: File): Promise<number | null> => {
    return new Promise(resolve => {
      const el = file.type.startsWith('audio/') ? new Audio() : document.createElement('video') as HTMLVideoElement;
      el.preload = 'metadata';
      el.onloadedmetadata = () => { URL.revokeObjectURL(el.src); resolve(Math.round(el.duration)); };
      el.onerror = () => resolve(null);
      el.src = URL.createObjectURL(file);
    });
  };

  // ── Voice recording ────────────────────────────────────────────────────────
  const [recording, setRecording] = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunks.current = [];
      mr.ondataavailable = e => audioChunks.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        await uploadMedia(file);
      };
      mr.start();
      mediaRecRef.current = mr;
      setRecording(true);
      setRecDuration(0);
      recTimerRef.current = setInterval(() => setRecDuration(d => d + 1), 1000);
    } catch {}
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    setRecording(false);
    if (recTimerRef.current) clearInterval(recTimerRef.current);
  };

  // ── Start call ─────────────────────────────────────────────────────────────
  const startCall = async (callType: 'voice' | 'video') => {
    if (!activeConv || !user) return;
    const otherUsers = (activeConv.participants ?? []).filter(p => p.user_id !== user.id).map(p => p.user_id);

    try {
      const constraints = callType === 'video' ? { audio: true, video: true } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMyStream(stream);
    } catch { /* camera/mic denied */ }

    const { data: call } = await supabase.from('chat_calls').insert({
      conversation_id: activeConv.id,
      call_type: callType,
      status: 'calling',
      participants: [user.id, ...otherUsers],
    }).select().single();

    if (call) setActiveCall(call as ChatCall);

    // Log call message
    await supabase.from('chat_messages').insert({
      conversation_id: activeConv.id,
      type: 'call_log',
      call_type: callType,
      call_status: 'calling',
    });
  };

  const endCall = async () => {
    if (!activeCall) return;
    const duration = Math.floor((Date.now() - new Date(activeCall.started_at).getTime()) / 1000);
    await supabase.from('chat_calls').update({ status: 'ended', ended_at: new Date().toISOString(), duration }).eq('id', activeCall.id);
    myStream?.getTracks().forEach(t => t.stop());
    setMyStream(null);
    setActiveCall(null);
    setMuted(false);
    setVideoOff(false);
    // Update log message
    if (activeConv) {
      const { data: logMsg } = await supabase.from('chat_messages').select('id').eq('conversation_id', activeConv.id).eq('type', 'call_log').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (logMsg) await supabase.from('chat_messages').update({ call_status: 'ended', call_duration: duration }).eq('id', logMsg.id);
    }
  };

  const toggleMute = () => {
    myStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(m => !m);
  };

  const toggleVideo = () => {
    myStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setVideoOff(v => !v);
  };

  // ── Create DM ──────────────────────────────────────────────────────────────
  const startDM = async () => {
    if (!newEmail.trim() || !user) return;
    const { data: target } = await supabase.from('user_profiles').select('user_id,nome').eq('user_id', newEmail.trim()).maybeSingle();
    if (!target) { alert('Utilizador não encontrado. Use o ID do utilizador.'); return; }

    // Check if DM exists
    const { data: existingParts } = await supabase.from('chat_participants').select('conversation_id').eq('user_id', user.id);
    const myConvIds = (existingParts ?? []).map(p => p.conversation_id);
    if (myConvIds.length) {
      const { data: existing } = await supabase.from('chat_conversations').select('id').eq('type', 'direct').in('id', myConvIds).maybeSingle();
      if (existing) {
        const { data: otherPart } = await supabase.from('chat_participants').select('conversation_id').eq('conversation_id', existing.id).eq('user_id', target.user_id).maybeSingle();
        if (otherPart) {
          const conv = conversations.find(c => c.id === existing.id);
          if (conv) { setActiveConv(conv); setShowAddChat(false); setNewEmail(''); return; }
        }
      }
    }

    const { data: conv } = await supabase.from('chat_conversations').insert({ type: 'direct', created_by: user.id }).select().single();
    if (!conv) return;
    await supabase.from('chat_participants').insert([
      { conversation_id: conv.id, user_id: user.id, role: 'admin' },
      { conversation_id: conv.id, user_id: target.user_id, role: 'member' },
    ]);
    await loadConversations();
    setShowAddChat(false);
    setNewEmail('');
  };

  // ── Create group ───────────────────────────────────────────────────────────
  const createGroup = async () => {
    if (!groupName.trim() || !user) return;
    const { data: conv } = await supabase.from('chat_conversations').insert({ type: 'group', name: groupName, created_by: user.id }).select().single();
    if (!conv) return;
    const uids = groupEmails.split(',').map(s => s.trim()).filter(Boolean);
    await supabase.from('chat_participants').insert([
      { conversation_id: conv.id, user_id: user.id, role: 'admin' },
      ...uids.map(uid => ({ conversation_id: conv.id, user_id: uid, role: 'member' })),
    ]);
    await loadConversations();
    setShowGroupModal(false);
    setGroupName('');
    setGroupEmails('');
  };

  // ── Post story ─────────────────────────────────────────────────────────────
  const postTextStory = async () => {
    if (!storyText.trim() || !user) return;
    await supabase.from('chat_stories').insert({ type: 'text', content: storyText, bg_color: storyBg });
    setStoryText(''); setShowNewStory(false);
    await loadStories();
  };

  const postMediaStory = async (file: File) => {
    if (!user) return;
    const path = `stories/${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
    const { data } = await supabase.storage.from('chat-media').upload(path, file);
    if (!data) return;
    const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);
    const t: ChatStory['type'] = file.type.startsWith('video') ? 'video' : 'image';
    await supabase.from('chat_stories').insert({ type: t, media_url: publicUrl });
    await loadStories();
    setShowNewStory(false);
  };

  const viewStory = async (story: ChatStory) => {
    await supabase.from('chat_story_views').upsert({ story_id: story.id, viewer_id: user!.id });
    const userStories = stories.filter(s => s.user_id === story.user_id);
    const idx = userStories.findIndex(s => s.id === story.id);
    setShowStoryViewer({ stories: userStories, idx: Math.max(0, idx) });
  };

  // ── Conversation display helpers ───────────────────────────────────────────
  const getConvName = (conv: Conversation) => {
    if (conv.type === 'group') return conv.name ?? 'Grupo';
    const other = (conv.participants ?? []).find(p => p.user_id !== user?.id);
    return allProfiles[other?.user_id ?? '']?.nome ?? 'Utilizador';
  };

  const getConvAvatar = (conv: Conversation): Profile | null => {
    if (conv.type === 'group') return null;
    const other = (conv.participants ?? []).find(p => p.user_id !== user?.id);
    return allProfiles[other?.user_id ?? ''] ?? null;
  };

  const filtered = conversations.filter(c =>
    getConvName(c).toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-8rem)] bg-gray-950 rounded-2xl overflow-hidden border border-gray-800 anim-page">
      {/* ── Sidebar ── */}
      <div className={`${showMobileSidebar ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-80 xl:w-96 border-r border-gray-800 bg-gray-900 shrink-0`}>
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-lg">Mensagens</h2>
            <div className="flex gap-1.5">
              <button onClick={() => setShowNewStory(true)}
                className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors" title="Story">
                <Camera size={15} />
              </button>
              <button onClick={() => setShowGroupModal(true)}
                className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors" title="Grupo">
                <Users size={15} />
              </button>
              <button onClick={() => setShowAddChat(true)}
                className="w-8 h-8 rounded-xl bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-white transition-colors" title="Nova conversa">
                <Plus size={15} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..."
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-gray-600 placeholder-gray-600" />
          </div>
        </div>

        {/* Stories strip */}
        {stories.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-800">
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {/* My story button */}
              <button onClick={() => setShowNewStory(true)}
                className="flex flex-col items-center gap-1.5 shrink-0 group">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center bg-gray-800 group-hover:border-emerald-500 transition-colors">
                  <Plus size={16} className="text-gray-500 group-hover:text-emerald-400 transition-colors" />
                </div>
                <span className="text-gray-500 text-xs">Story</span>
              </button>
              {stories.map((story, i) => (
                <StoryRing key={story.id} story={story} viewed={story.viewed ?? false}
                  onClick={() => viewStory(story)} />
              ))}
            </div>
          </div>
        )}

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
                <MessageIcon size={20} className="text-gray-600" />
              </div>
              <p className="text-gray-500 text-sm">Sem conversas</p>
              <p className="text-gray-600 text-xs mt-1">Inicie uma nova conversa</p>
            </div>
          ) : (
            filtered.map(conv => (
              <button key={conv.id}
                onClick={() => { setActiveConv(conv); setShowMobileSidebar(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-800/50 transition-colors text-left border-b border-gray-800/50 ${activeConv?.id === conv.id ? 'bg-gray-800' : ''}`}>
                <div className="relative shrink-0">
                  {conv.type === 'group'
                    ? <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-blue-600 flex items-center justify-center"><Users size={18} className="text-white" /></div>
                    : <Avatar profile={getConvAvatar(conv)} size="md" />}
                  {conv.unreadCount ? (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </span>
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-white text-sm font-semibold truncate">{getConvName(conv)}</p>
                    {conv.lastMessage && <span className="text-gray-600 text-xs shrink-0 ml-2">{formatMsgTime(conv.lastMessage.created_at)}</span>}
                  </div>
                  <p className="text-gray-500 text-xs truncate">
                    {conv.lastMessage?.deleted_at ? 'Mensagem apagada' :
                     conv.lastMessage?.type === 'image' ? '📷 Imagem' :
                     conv.lastMessage?.type === 'audio' ? '🎤 Áudio' :
                     conv.lastMessage?.type === 'video' ? '🎥 Vídeo' :
                     conv.lastMessage?.type === 'file' ? '📎 Ficheiro' :
                     conv.lastMessage?.type === 'sticker' ? conv.lastMessage.sticker_id ?? '🎭 Sticker' :
                     conv.lastMessage?.content ?? 'Sem mensagens'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Chat area ── */}
      {activeConv ? (
        <div className={`${!showMobileSidebar ? 'flex' : 'hidden'} lg:flex flex-1 flex-col min-w-0`}>
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900">
            <button onClick={() => setShowMobileSidebar(true)} className="lg:hidden text-gray-400 hover:text-white p-1">
              <ArrowLeft size={20} />
            </button>
            {activeConv.type === 'group'
              ? <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-blue-600 flex items-center justify-center shrink-0"><Users size={16} className="text-white" /></div>
              : <Avatar profile={getConvAvatar(activeConv)} size="sm" />}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{getConvName(activeConv)}</p>
              {typingUsers.size > 0 ? (
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                  <span>a escrever...</span>
                </div>
              ) : (
                <p className="text-gray-500 text-xs">
                  {activeConv.type === 'group'
                    ? `${(activeConv.participants ?? []).length} membros`
                    : 'Online'}
                </p>
              )}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => startCall('voice')}
                className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-emerald-400 transition-colors" title="Chamada de voz">
                <Phone size={15} />
              </button>
              <button onClick={() => startCall('video')}
                className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-emerald-400 transition-colors" title="Videochamada">
                <Video size={15} />
              </button>
              <button className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors" title="Mais opções">
                <MoreVertical size={15} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                mine={msg.sender_id === user?.id}
                profile={allProfiles[msg.sender_id]}
                onReact={handleReact}
                onReply={m => { setReplyTo(m); setEditMsg(null); }}
                onEdit={m => { setEditMsg(m); setText(m.content ?? ''); setReplyTo(null); }}
                onDelete={handleDelete}
                allProfiles={allProfiles}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Reply/edit bar */}
          {(replyTo || editMsg) && (
            <div className="mx-4 mb-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-emerald-400 text-xs font-medium">
                  {editMsg ? 'Editar mensagem' : `Respondendo a ${allProfiles[replyTo!.sender_id]?.nome ?? ''}`}
                </p>
                <p className="text-gray-400 text-xs truncate">{(editMsg ?? replyTo)?.content ?? ''}</p>
              </div>
              <button onClick={() => { setReplyTo(null); setEditMsg(null); setText(''); }}
                className="text-gray-500 hover:text-white p-1 shrink-0">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Upload progress */}
          {mediaUploading && (
            <div className="mx-4 mb-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-400 text-xs">A enviar...</span>
              </div>
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Stickers panel */}
          {showStickers && (
            <div className="mx-4 mb-2 bg-gray-800 border border-gray-700 rounded-2xl p-3">
              <div className="grid grid-cols-6 gap-1.5">
                {STICKERS.map(s => (
                  <button key={s.id} onClick={() => sendMessage('sticker', { sticker_id: s.emoji })}
                    className="text-2xl hover:scale-125 transition-transform p-1 rounded-xl hover:bg-gray-700">
                    {s.emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input bar */}
          <div className="px-4 pb-4 pt-2">
            <div className="flex items-end gap-2 bg-gray-800 border border-gray-700 rounded-2xl px-3 py-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadMedia(f); e.target.value = ''; }}
              />
              <button onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-gray-500 hover:text-white transition-colors shrink-0" title="Enviar ficheiro">
                <Paperclip size={18} />
              </button>
              <button onClick={() => setShowStickers(s => !s)}
                className={`p-1.5 transition-colors shrink-0 ${showStickers ? 'text-emerald-400' : 'text-gray-500 hover:text-white'}`} title="Stickers">
                <Sticker size={18} />
              </button>
              <textarea
                value={text}
                onChange={e => handleTextChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                placeholder="Escreva uma mensagem..."
                rows={1}
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none resize-none max-h-24 overflow-y-auto"
                style={{ lineHeight: '1.5' }}
              />
              {text.trim() || editMsg ? (
                <button onClick={() => sendMessage()}
                  disabled={sending}
                  className="w-8 h-8 rounded-xl bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-white transition-colors shrink-0 disabled:opacity-50 btn-ripple">
                  <Send size={15} />
                </button>
              ) : recording ? (
                <button onClick={stopRecording}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded-xl transition-colors shrink-0">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  {formatDuration(recDuration)}
                  <X size={12} />
                </button>
              ) : (
                <button onMouseDown={startRecording}
                  className="w-8 h-8 rounded-xl bg-gray-700 hover:bg-emerald-500/20 flex items-center justify-center text-gray-400 hover:text-emerald-400 transition-colors shrink-0" title="Gravar áudio">
                  <Mic size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={`${!showMobileSidebar ? 'flex' : 'hidden'} lg:flex flex-1 items-center justify-center`}>
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <MessageCircleIcon size={28} className="text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium">Selecione uma conversa</p>
            <p className="text-gray-600 text-sm mt-1">ou inicie uma nova</p>
            <button onClick={() => setShowAddChat(true)}
              className="mt-4 btn-liquid btn-ripple flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors mx-auto">
              <Plus size={16} /> Nova conversa
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* New DM modal */}
      {showAddChat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddChat(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 anim-modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Nova Conversa</h3>
              <button onClick={() => setShowAddChat(false)} className="text-gray-500 hover:text-white p-1"><X size={18} /></button>
            </div>
            <label className="block text-xs text-gray-500 mb-1.5">ID do utilizador</label>
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
              placeholder="Cole o ID (UUID) do utilizador"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 mb-4 placeholder-gray-600" />
            <p className="text-gray-600 text-xs mb-5">O utilizador pode encontrar o seu ID no Perfil → Configurações.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowAddChat(false)}
                className="flex-1 border border-gray-700 text-gray-300 text-sm py-2.5 rounded-xl hover:bg-gray-800 transition-colors">
                Cancelar
              </button>
              <button onClick={startDM} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors btn-liquid btn-ripple">
                Iniciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowGroupModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 anim-modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Criar Grupo</h3>
              <button onClick={() => setShowGroupModal(false)} className="text-gray-500 hover:text-white p-1"><X size={18} /></button>
            </div>
            <label className="block text-xs text-gray-500 mb-1.5">Nome do grupo *</label>
            <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Ex: Equipa IK Finance"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 mb-4 placeholder-gray-600" />
            <label className="block text-xs text-gray-500 mb-1.5">IDs dos participantes (separados por vírgula)</label>
            <textarea value={groupEmails} onChange={e => setGroupEmails(e.target.value)} rows={3} placeholder="uuid1, uuid2, uuid3..."
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 mb-5 placeholder-gray-600 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowGroupModal(false)}
                className="flex-1 border border-gray-700 text-gray-300 text-sm py-2.5 rounded-xl hover:bg-gray-800 transition-colors">Cancelar</button>
              <button onClick={createGroup} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold py-2.5 rounded-xl btn-liquid btn-ripple transition-colors">
                Criar Grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New story modal */}
      {showNewStory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNewStory(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 anim-modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Novo Story</h3>
              <button onClick={() => setShowNewStory(false)} className="text-gray-500 hover:text-white p-1"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <label className="flex flex-col items-center gap-2 p-4 bg-gray-800 border border-gray-700 rounded-2xl cursor-pointer hover:border-emerald-600 transition-colors">
                <ImageIcon size={24} className="text-gray-400" />
                <span className="text-gray-300 text-sm">Foto/Vídeo</span>
                <input type="file" accept="image/*,video/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { postMediaStory(f); } }} />
              </label>
              <button onClick={() => {/* text story below */}}
                className="flex flex-col items-center gap-2 p-4 bg-gray-800 border border-gray-700 rounded-2xl hover:border-emerald-600 transition-colors">
                <Edit3 size={24} className="text-gray-400" />
                <span className="text-gray-300 text-sm">Texto</span>
              </button>
            </div>
            <textarea value={storyText} onChange={e => setStoryText(e.target.value)} rows={3}
              placeholder="Escreva algo para o seu story..."
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 mb-3 resize-none placeholder-gray-600" />
            <div className="flex gap-2 mb-4">
              {['#1f2937','#064e3b','#1e1b4b','#450a0a','#14532d','#713f12'].map(c => (
                <button key={c} onClick={() => setStoryBg(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${storyBg === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ background: c }} />
              ))}
            </div>
            <button onClick={postTextStory} disabled={!storyText.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl btn-liquid btn-ripple transition-colors">
              Publicar Story
            </button>
          </div>
        </div>
      )}

      {/* Story viewer */}
      {showStoryViewer && (
        <StoryViewer stories={showStoryViewer.stories} startIndex={showStoryViewer.idx}
          onClose={() => setShowStoryViewer(null)} />
      )}

      {/* Active call overlay */}
      {activeCall && (
        <CallOverlay
          call={activeCall} myStream={myStream} peerStream={null}
          onEnd={endCall} onMuteToggle={toggleMute} onVideoToggle={toggleVideo}
          muted={muted} videoOff={videoOff}
        />
      )}
    </div>
  );
}

// Inline icon aliases to avoid missing imports
function MessageIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MessageCircleIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
