import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, FileText, MessageCircle, Mic, Paperclip, Search, Send, Trash2, X } from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { openIKViewer } from '../components/IKViewer';
import { detectMediaType, isMarketplaceFileAllowed } from '../lib/marketplace';
import { checkMarketplaceRateLimit } from '../lib/marketplaceGuardrails';

type ConversationSummary = {
  id: string;
  type: 'direct' | 'group';
  updated_at: string;
  otherUserId: string | null;
  otherName: string;
  otherAvatar: string | null;
  lastMessage: string;
  unread: number;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'deleted';
  content: string | null;
  media_url: string | null;
  media_name: string | null;
  media_mime: string | null;
  media_size: number | null;
  created_at: string;
};

type UserMini = {
  user_id: string;
  nome: string | null;
  avatar_url: string | null;
  email?: string | null;
};

async function ensureDirectConversation(currentUserId: string, targetUserId: string) {
  const { data: myParts } = await supabase.from('chat_participants').select('conversation_id').eq('user_id', currentUserId).is('left_at', null);
  const ids = (myParts ?? []).map((item) => item.conversation_id);

  if (ids.length > 0) {
    const { data: targetParts } = await supabase.from('chat_participants').select('conversation_id').eq('user_id', targetUserId).is('left_at', null).in('conversation_id', ids);
    const sharedIds = (targetParts ?? []).map((item) => item.conversation_id);
    if (sharedIds.length > 0) {
      const { data: existing } = await supabase.from('chat_conversations').select('id').eq('type', 'direct').in('id', sharedIds).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (existing?.id) return existing.id as string;
    }
  }

  const { data: created, error } = await supabase
    .from('chat_conversations')
    .insert({ type: 'direct', created_by: currentUserId })
    .select()
    .single();

  if (error) throw error;
  if (!created) throw new Error('Falha ao criar conversa');

  await supabase.from('chat_participants').insert([
    { conversation_id: created.id, user_id: currentUserId, role: 'admin' },
    { conversation_id: created.id, user_id: targetUserId, role: 'member' },
  ]);
  return created.id as string;
}

export default function Chat({ initialUserId }: { initialUserId?: string }) {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [newIdentifier, setNewIdentifier] = useState('');
  const [starting, setStarting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const activeConversation = conversations.find((item) => item.id === activeConversationId) ?? null;

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data: participantRows } = await supabase.from('chat_participants').select('conversation_id,last_read_at').eq('user_id', user.id).is('left_at', null);
    const conversationIds = (participantRows ?? []).map((item) => item.conversation_id);
    if (conversationIds.length === 0) {
      setConversations([]);
      return;
    }

    const { data: conversationsData } = await supabase.from('chat_conversations').select('*').in('id', conversationIds).order('updated_at', { ascending: false });
    const { data: participantsData } = await supabase.from('chat_participants').select('conversation_id,user_id').in('conversation_id', conversationIds).is('left_at', null);
    const otherUserIds = Array.from(new Set((participantsData ?? []).filter((item) => item.user_id !== user.id).map((item) => item.user_id)));
    const { data: profiles } = otherUserIds.length > 0 ? await supabase.from('user_profiles').select('user_id,nome,avatar_url,email').in('user_id', otherUserIds) : { data: [] };
    const profileMap = new Map((profiles as UserMini[] ?? []).map((profile) => [profile.user_id, profile]));

    const summaries = await Promise.all((conversationsData ?? []).map(async (conversation: any) => {
      const otherParticipant = (participantsData ?? []).find((item) => item.conversation_id === conversation.id && item.user_id !== user.id);
      const otherProfile = otherParticipant ? profileMap.get(otherParticipant.user_id) : null;
      const { data: messageRows } = await supabase.from('chat_messages').select('*').eq('conversation_id', conversation.id).order('created_at', { ascending: false }).limit(1);
      const { count: unread } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('conversation_id', conversation.id).neq('sender_id', user.id).gt('created_at', (participantRows ?? []).find((row) => row.conversation_id === conversation.id)?.last_read_at ?? '1970-01-01');
      const lastMessage = (messageRows as ChatMessage[] | null)?.[0];
      const lastLabel = lastMessage?.type === 'deleted' ? 'Mensagem apagada' : lastMessage?.type === 'audio' ? '🎤 Mensagem de voz' : lastMessage?.content ?? lastMessage?.media_name ?? 'Sem mensagens';
      return {
        id: conversation.id,
        type: conversation.type,
        updated_at: conversation.updated_at,
        otherUserId: otherParticipant?.user_id ?? null,
        otherName: otherProfile?.nome ?? otherProfile?.email ?? otherParticipant?.user_id ?? 'Conversa',
        otherAvatar: otherProfile?.avatar_url ?? null,
        lastMessage: lastLabel,
        unread: unread ?? 0,
      } satisfies ConversationSummary;
    }));
    setConversations(summaries);
    setActiveConversationId((prev) => prev ?? summaries[0]?.id ?? null);
  }, [user]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    const { data } = await supabase.from('chat_messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
    setMessages((data ?? []) as ChatMessage[]);
    await supabase.from('chat_participants').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversationId).eq('user_id', user!.id);
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!initialUserId || !user) return;
    (async () => {
      const conversationId = await ensureDirectConversation(user.id, initialUserId);
      setActiveConversationId(conversationId);
      await loadConversations();
    })();
  }, [initialUserId, loadConversations, user]);

  useEffect(() => {
    const handler = async (event: any) => {
      const id = event?.detail?.id;
      if (!id || !user) return;
      const conversationId = await ensureDirectConversation(user.id, id);
      setActiveConversationId(conversationId);
      await loadConversations();
    };
    window.addEventListener('openChatWith', handler as EventListener);
    return () => window.removeEventListener('openChatWith', handler as EventListener);
  }, [loadConversations, user]);

  useEffect(() => {
    if (!activeConversationId) return;
    loadMessages(activeConversationId);
    const channel = supabase.channel(`chat:${activeConversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${activeConversationId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        loadConversations();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${activeConversationId}` }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, () => {
        loadMessages(activeConversationId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConversationId, loadConversations, loadMessages]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      cancelledRef.current = true;
      mediaRecorderRef.current.stop();
    }
  }, []);

  const notifyOther = async (body: string) => {
    if (activeConversation?.otherUserId) {
      await sendNotification('Nova mensagem privada', body, 'marketplace_message', { userId: activeConversation.otherUserId, url: '/?page=chat' });
    }
  };

  const sendMessage = async () => {
    if (!user || !activeConversationId || (!text.trim() && !attachment)) return;
    const rateLimit = await checkMarketplaceRateLimit({ action: 'chat_message', limit: 30, windowMs: 10 * 60 * 1000, userId: user.id, metadata: { conversationId: activeConversationId } });
    if (!rateLimit.allowed) {
      alert('Está a enviar mensagens rápido demais. Aguarde um pouco.');
      return;
    }
    let mediaUrl: string | null = null;
    let mediaName: string | null = null;
    let mediaMime: string | null = null;
    let messageType: ChatMessage['type'] = 'text';
    if (attachment) {
      if (!isMarketplaceFileAllowed(attachment)) {
        alert('Ficheiro bloqueado por segurança.');
        return;
      }
      setUploading(true);
      const path = `${user.id}/${activeConversationId}/${Date.now()}-${attachment.name.replace(/\s+/g, '_')}`;
      const { error } = await supabase.storage.from('chat-media').upload(path, attachment, { upsert: true });
      if (error) {
        setUploading(false);
        alert('Não foi possível enviar o ficheiro.');
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);
      mediaUrl = publicUrl;
      mediaName = attachment.name;
      mediaMime = attachment.type;
      const detected = detectMediaType(attachment.name, attachment.type);
      messageType = detected === 'document' ? 'file' : detected;
    }
    const { error } = await supabase.from('chat_messages').insert({
      conversation_id: activeConversationId,
      sender_id: user.id,
      type: messageType,
      content: text.trim() || null,
      media_url: mediaUrl,
      media_name: mediaName,
      media_mime: mediaMime,
      media_size: attachment?.size ?? null,
    });
    if (error) {
      alert(error.message);
      setUploading(false);
      return;
    }
    await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversationId);
    await notifyOther(text.trim() || `Recebeu um novo anexo de ${user.email ?? 'um utilizador'}.`);
    setText('');
    setAttachment(null);
    setUploading(false);
  };

  const sendAudio = async (blob: Blob) => {
    if (!user || !activeConversationId) return;
    setUploading(true);
    try {
      const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
      const path = `${user.id}/${activeConversationId}/${Date.now()}-voz.${ext}`;
      const { error } = await supabase.storage.from('chat-media').upload(path, blob, { upsert: true, contentType: blob.type || 'audio/webm' });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);
      const { error: insertError } = await supabase.from('chat_messages').insert({
        conversation_id: activeConversationId,
        sender_id: user.id,
        type: 'audio',
        content: null,
        media_url: publicUrl,
        media_name: 'Mensagem de voz',
        media_mime: blob.type || 'audio/webm',
        media_size: blob.size,
      });
      if (insertError) throw insertError;
      await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversationId);
      await notifyOther('Recebeu uma mensagem de voz.');
    } catch (error) {
      console.error('audio error', error);
      alert('Não foi possível enviar a mensagem de voz.');
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    if (!user || !activeConversationId || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      cancelledRef.current = false;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setRecording(false);
        setRecordSeconds(0);
        if (!cancelledRef.current && chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          await sendAudio(blob);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((value) => value + 1), 1000);
    } catch (error) {
      console.error('mic error', error);
      alert('Não foi possível aceder ao microfone. Verifique as permissões do navegador.');
    }
  };

  const stopRecording = (cancel: boolean) => {
    cancelledRef.current = cancel;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return;
    if (!window.confirm('Apagar esta mensagem?')) return;
    try {
      const { data, error } = await supabase.rpc('delete_chat_message', { p_message_id: messageId, p_user_id: user.id });
      if (error) throw error;
      if (data?.action === 'deleted') {
        setMessages((prev) => prev.map((item) => (item.id === messageId ? { ...item, type: 'deleted' as const, content: null, media_url: null, media_name: null, media_mime: null, media_size: null } : item)));
        await loadConversations();
      }
      if (data?.action === 'not_owner') {
        alert('Só pode apagar as suas próprias mensagens.');
      }
    } catch (error) {
      console.error('delete message error', error);
      alert('Não foi possível apagar a mensagem.');
    }
  };

  const clearConversation = async () => {
    if (!user || !activeConversationId) return;
    if (!window.confirm('Apagar TODAS as mensagens desta conversa? Esta ação não pode ser desfeita.')) return;
    try {
      const { data, error } = await supabase.rpc('clear_chat_conversation', { p_conversation_id: activeConversationId, p_user_id: user.id });
      if (error) throw error;
      if (data?.action === 'cleared') {
        setMessages([]);
        await loadConversations();
      }
    } catch (error) {
      console.error('clear conversation error', error);
      alert('Não foi possível limpar a conversa.');
    }
  };

  const startChat = async () => {
    if (!user || !newIdentifier.trim()) return;
    setStarting(true);
    const identifier = newIdentifier.trim();
    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('user_id,nome,email,username')
      .or(`email.ilike.${identifier},username.eq.${identifier.replace(/^@/, '')},nome.ilike.%${identifier}%`)
      .neq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    if (targetProfile?.user_id) {
      const conversationId = await ensureDirectConversation(user.id, targetProfile.user_id);
      setActiveConversationId(conversationId);
      setNewIdentifier('');
      await loadConversations();
    }
    setStarting(false);
  };

  const filtered = useMemo(() => conversations.filter((conversation) => conversation.otherName.toLowerCase().includes(search.toLowerCase())), [conversations, search]);
  const fmt = (value: string) => new Date(value).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
  const fmtSecs = (value: number) => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">Mensagens</h1>
        <p className="text-gray-400 text-sm mt-0.5">Converse com compradores, fornecedores e parceiros com anexos, comprovativos e media.</p>
      </div>

      <div className="flex flex-1 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden min-h-0">
        <div className="w-72 border-r border-gray-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-800">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar conversa..." className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
          </div>

          <div className="p-3 border-b border-gray-800">
            <div className="flex gap-2">
              <input value={newIdentifier} onChange={(event) => setNewIdentifier(event.target.value)} placeholder="E-mail, @username ou nome" className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors" />
              <button onClick={startChat} disabled={starting || !newIdentifier} className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white px-2.5 py-2 rounded-xl text-xs transition-colors"><Send size={12} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-8"><MessageCircle size={24} className="text-gray-700 mx-auto mb-2" /><p className="text-gray-600 text-xs">Nenhuma conversa</p></div>
            ) : filtered.map((conversation) => (
              <button key={conversation.id} onClick={() => setActiveConversationId(conversation.id)} className={`w-full flex items-start gap-3 p-3 text-left hover:bg-gray-800 transition-colors ${activeConversationId === conversation.id ? 'bg-gray-800/80' : ''}`}>
                <div className="w-9 h-9 rounded-xl bg-gray-700 overflow-hidden flex items-center justify-center text-gray-300 shrink-0 font-bold text-sm">
                  {conversation.otherAvatar ? <img src={conversation.otherAvatar} alt="" className="w-full h-full object-cover" /> : conversation.otherName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white text-xs font-medium truncate">{conversation.otherName}</p>
                    <span className="text-gray-600 text-[10px] shrink-0">{fmt(conversation.updated_at)}</span>
                  </div>
                  <p className="text-gray-500 text-xs truncate mt-0.5">{conversation.lastMessage}</p>
                </div>
                {conversation.unread > 0 && <span className="bg-emerald-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0">{conversation.unread}</span>}
              </button>
            ))}
          </div>
        </div>

        {activeConversation ? (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-800">
              <div className="w-8 h-8 rounded-xl bg-gray-700 overflow-hidden flex items-center justify-center text-white font-bold text-sm">
                {activeConversation.otherAvatar ? <img src={activeConversation.otherAvatar} alt="" className="w-full h-full object-cover" /> : activeConversation.otherName[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{activeConversation.otherName}</p>
                <p className="text-gray-500 text-xs">Conversa privada</p>
              </div>
              <button onClick={clearConversation} title="Apagar todas as mensagens" className="text-gray-500 hover:text-red-400 p-2 transition-colors shrink-0"><Trash2 size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8"><MessageCircle size={28} className="text-gray-700 mx-auto mb-2" /><p className="text-gray-600 text-sm">Inicie a conversa</p></div>
              ) : messages.map((message) => {
                const mine = message.sender_id === user?.id;
                return (
                  <div key={message.id} className={`group flex items-center gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                    {mine && message.type !== 'deleted' && (
                      <button onClick={() => deleteMessage(message.id)} title="Apagar mensagem" className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-opacity shrink-0"><Trash2 size={14} /></button>
                    )}
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${mine ? 'bg-emerald-600 rounded-br-sm' : 'bg-gray-800 rounded-bl-sm'}`}>
                      {message.type === 'deleted' ? (
                        <p className="text-white/50 text-sm italic">🚫 Mensagem apagada</p>
                      ) : message.type === 'audio' && message.media_url ? (
                        <audio controls src={message.media_url} className="max-w-full h-10" preload="metadata" />
                      ) : (
                        <>
                          {message.media_url && (
                            <button type="button" onClick={() => openIKViewer({ url: message.media_url ?? '', name: message.media_name ?? 'Anexo', mimeType: message.media_mime ?? undefined, size: message.media_size ?? undefined, description: message.content ?? 'Anexo da conversa' })} className="block mb-2 w-full text-left rounded-xl bg-black/20 border border-white/10 px-3 py-2 hover:bg-black/30 transition-colors">
                              <div className="flex items-center gap-2">
                                <FileText size={14} className="text-white/80" />
                                <div className="min-w-0">
                                  <p className="text-white text-xs font-medium truncate">{message.media_name ?? 'Anexo'}</p>
                                  <p className="text-white/60 text-[11px] uppercase">{message.type}</p>
                                </div>
                              </div>
                            </button>
                          )}
                          {message.content && <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>}
                        </>
                      )}
                      <div className={`flex items-center gap-1 mt-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-xs opacity-60">{fmt(message.created_at)}</span>
                        {mine && message.type !== 'deleted' && (message.created_at ? <CheckCheck size={11} className="opacity-70" /> : <Check size={11} className="opacity-50" />)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 border-t border-gray-800 space-y-2">
              {attachment && !recording && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2">
                  <p className="text-gray-300 text-xs truncate">{attachment.name}</p>
                  <button onClick={() => setAttachment(null)} className="text-gray-500 hover:text-white text-xs">Remover</button>
                </div>
              )}

              {recording ? (
                <div className="flex items-center gap-3 bg-gray-800 border border-red-500/40 rounded-xl px-4 py-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="text-white text-sm font-medium tabular-nums">{fmtSecs(recordSeconds)}</span>
                  <span className="text-gray-400 text-xs flex-1">A gravar mensagem de voz...</span>
                  <button onClick={() => stopRecording(true)} title="Cancelar" className="text-gray-400 hover:text-red-400 p-2 transition-colors"><X size={18} /></button>
                  <button onClick={() => stopRecording(false)} title="Enviar áudio" className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl flex items-center justify-center transition-colors"><Send size={16} /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && !event.shiftKey && (event.preventDefault(), sendMessage())} placeholder="Escreva uma mensagem..." className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                  <input ref={fileRef} type="file" className="hidden" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} />
                  <button type="button" onClick={() => fileRef.current?.click()} className="h-10 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center justify-center transition-colors shrink-0" title="Anexar ficheiro"><Paperclip size={16} /></button>
                  {text.trim() || attachment ? (
                    <button onClick={sendMessage} disabled={uploading} className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"><Send size={16} /></button>
                  ) : (
                    <button onClick={startRecording} disabled={uploading} title="Gravar mensagem de voz" className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"><Mic size={16} /></button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center"><div className="text-center"><MessageCircle size={40} className="text-gray-700 mx-auto mb-3" /><p className="text-gray-400 font-medium">Selecione uma conversa</p><p className="text-gray-600 text-sm mt-1">ou inicie um novo chat acima</p></div></div>
        )}
      </div>
    </div>
  );
}
