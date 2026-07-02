import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Search, User, Check, CheckCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Contact = {
  user_id: string;
  email: string;
  lastMessage?: string;
  lastTime?: string;
  unread: number;
};

type Message = {
  id: string; from_id: string; to_id: string;
  conteudo: string; lida: boolean; created_at: string;
};

export default function Chat() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [starting, setStarting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadContacts = async () => {
    if (!user) return;
    const { data } = await supabase.from('messages')
      .select('from_id, to_id, conteudo, lida, created_at')
      .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!data) return;
    const map = new Map<string, Contact>();
    for (const m of data) {
      const otherId = m.from_id === user.id ? m.to_id : m.from_id;
      if (!map.has(otherId)) {
        map.set(otherId, {
          user_id: otherId,
          email: otherId.substring(0, 8) + '...',
          lastMessage: m.conteudo,
          lastTime: m.created_at,
          unread: (!m.lida && m.to_id === user.id) ? 1 : 0,
        });
      } else {
        const c = map.get(otherId)!;
        if (!m.lida && m.to_id === user.id) c.unread++;
      }
    }
    setContacts(Array.from(map.values()));
  };

  const loadMessages = async (otherId: string) => {
    setLoading(true);
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`and(from_id.eq.${user!.id},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${user!.id})`)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
    setLoading(false);
    // Mark as read
    await supabase.from('messages').update({ lida: true }).eq('from_id', otherId).eq('to_id', user!.id).eq('lida', false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  useEffect(() => { loadContacts(); }, [user?.id]);

  useEffect(() => {
    if (!active) return;
    loadMessages(active.user_id);
    const ch = supabase.channel(`chat-${active.user_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new as Message;
        if ((m.from_id === active.user_id && m.to_id === user!.id) || (m.from_id === user!.id && m.to_id === active.user_id)) {
          setMessages(prev => [...prev, m]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active?.user_id]);

  const send = async () => {
    if (!text.trim() || !active || !user) return;
    const msg = text.trim();
    setText('');
    await supabase.from('messages').insert({ from_id: user.id, to_id: active.user_id, conteudo: msg });
  };

  const startChat = async () => {
    if (!newEmail.trim()) return;
    setStarting(true);
    // Find user by email via profiles
    const { data } = await supabase.from('user_profiles').select('user_id').ilike('user_id', '%').limit(1);
    // For now, create a contact placeholder with email as display
    const mockContact: Contact = {
      user_id: newEmail, // In production, resolve email → user_id
      email: newEmail,
      unread: 0,
    };
    setContacts(prev => [mockContact, ...prev]);
    setActive(mockContact);
    setNewEmail('');
    setStarting(false);
  };

  const filtered = contacts.filter(c => c.email.toLowerCase().includes(search.toLowerCase()));
  const fmt = (s: string) => new Date(s).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">Mensagens</h1>
        <p className="text-gray-400 text-sm mt-0.5">Chat privado seguro com outros utilizadores</p>
      </div>

      <div className="flex flex-1 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden min-h-0">
        {/* Contacts sidebar */}
        <div className="w-64 border-r border-gray-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-800">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar..."
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
          </div>

          {/* New chat */}
          <div className="p-3 border-b border-gray-800">
            <div className="flex gap-2">
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="E-mail do contacto"
                className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors" />
              <button onClick={startChat} disabled={starting || !newEmail}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white px-2.5 py-2 rounded-xl text-xs transition-colors">
                <Send size={12} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle size={24} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-600 text-xs">Nenhuma conversa</p>
              </div>
            ) : filtered.map(c => (
              <button key={c.user_id} onClick={() => setActive(c)}
                className={`w-full flex items-start gap-3 p-3 text-left hover:bg-gray-800 transition-colors ${active?.user_id === c.user_id ? 'bg-gray-800/80' : ''}`}>
                <div className="w-9 h-9 rounded-xl bg-gray-700 flex items-center justify-center text-gray-300 shrink-0 font-bold text-sm">
                  {c.email[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-white text-xs font-medium truncate">{c.email}</p>
                    {c.lastTime && <span className="text-gray-600 text-[10px] shrink-0">{fmt(c.lastTime)}</span>}
                  </div>
                  {c.lastMessage && <p className="text-gray-500 text-xs truncate mt-0.5">{c.lastMessage}</p>}
                </div>
                {c.unread > 0 && (
                  <span className="bg-emerald-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0">{c.unread}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        {active ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-800">
              <div className="w-8 h-8 rounded-xl bg-gray-700 flex items-center justify-center text-white font-bold text-sm">
                {active.email[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{active.email}</p>
                <p className="text-gray-500 text-xs">Online</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle size={28} className="text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Inicie a conversa</p>
                </div>
              ) : messages.map(m => {
                const mine = m.from_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${mine ? 'bg-emerald-600 rounded-br-sm' : 'bg-gray-800 rounded-bl-sm'}`}>
                      <p className="text-white text-sm leading-relaxed">{m.conteudo}</p>
                      <div className={`flex items-center gap-1 mt-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-xs opacity-60">{fmt(m.created_at)}</span>
                        {mine && (m.lida ? <CheckCheck size={11} className="opacity-70" /> : <Check size={11} className="opacity-50" />)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-800">
              <div className="flex gap-2">
                <input value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                  placeholder="Escreva uma mensagem..."
                  className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                <button onClick={send} disabled={!text.trim()}
                  className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors shrink-0">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle size={40} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Selecione uma conversa</p>
              <p className="text-gray-600 text-sm mt-1">ou inicie um novo chat acima</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
