import React, { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Ban,
  Briefcase,
  Building2,
  Calendar,
  Globe2,
  Handshake,
  Image as ImageIcon,
  Languages,
  Loader2,
  MapPin,
  MessageCircle,
  Newspaper,
  Phone,
  ShoppingBag,
  Star,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import BusinessPanel from '../components/Community/BusinessPanel';
import DealPanel from '../components/DealPanel';
import StoreCard from '../components/StoreCard';
import { useAuth } from '../context/AuthContext';

type TabId = 'info' | 'stats' | 'posts' | 'stories' | 'lojas';

const TABS: { id: TabId; label: string }[] = [
  { id: 'info', label: 'Info' },
  { id: 'stats', label: 'Estatísticas' },
  { id: 'posts', label: 'Publicações' },
  { id: 'stories', label: 'Stories' },
  { id: 'lojas', label: 'Lojas' },
];

export default function UserProfile({ userId }: { userId: string | null }) {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabId>('info');
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [showDeal, setShowDeal] = useState(false);
  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    (async () => {
      try {
        const { data } = await supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle();
        setProfile(data || null);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data } = await supabase.from('stores').select('*').eq('owner_id', userId).is('deleted_at', null).order('created_at', { ascending: false });
        setStores(data || []);
      } catch (e) { console.error('load stores', e); }
    })();
  }, [userId]);

  useEffect(() => {
    if (!user || !userId) return;
    (async () => {
      try {
        const { data } = await supabase.from('follows').select('*').match({ from_id: user.id, to_id: userId });
        setIsFollowing(!!(data?.length));
      } catch (e) { console.error(e); }
      try {
        const { data } = await supabase.from('blocks').select('*').match({ blocker_id: user.id, blocked_id: userId });
        setIsBlocked(!!(data?.length));
      } catch (e) { console.error(e); }
    })();
  }, [user, userId]);

  const openChat = () => {
    window.dispatchEvent(new CustomEvent('openChatWith', { detail: { id: userId } }));
    window.dispatchEvent(new CustomEvent('openChat'));
  };

  const toggleFollow = async () => {
    if (!user) { alert('Login necessário'); return; }
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().match({ from_id: user.id, to_id: userId });
        setIsFollowing(false);
      } else {
        await supabase.from('follows').insert({ from_id: user.id, to_id: userId, created_at: new Date() });
        setIsFollowing(true);
      }
    } catch (e) { console.error(e); }
    finally { setFollowBusy(false); }
  };

  const toggleBlock = async () => {
    if (!user) { alert('Login necessário'); return; }
    setBlockBusy(true);
    try {
      if (isBlocked) {
        await supabase.from('blocks').delete().match({ blocker_id: user.id, blocked_id: userId });
        setIsBlocked(false);
      } else {
        await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: userId, created_at: new Date() });
        setIsBlocked(true);
      }
    } catch (e) { console.error(e); }
    finally { setBlockBusy(false); }
  };

  if (!userId) {
    return (
      <div className="p-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
          <Users size={28} className="text-gray-700 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Selecione um utilizador para ver o perfil</p>
        </div>
      </div>
    );
  }

  if (loading && !profile) {
    return (
      <div className="p-6 flex justify-center py-20">
        <Loader2 size={28} className="text-emerald-500 animate-spin" />
      </div>
    );
  }

  const infoItems = [
    { icon: Globe2, label: 'País', value: profile?.country },
    { icon: MapPin, label: 'Cidade', value: profile?.city },
    { icon: Languages, label: 'Idiomas', value: profile?.languages },
    { icon: Phone, label: 'Contactos', value: profile?.phone },
    { icon: Building2, label: 'Empresa', value: profile?.company },
    { icon: Briefcase, label: 'Profissão', value: profile?.profession },
  ];

  const statItems = [
    { icon: Users, label: 'Seguidores', value: profile?.followers_count ?? 0 },
    { icon: UserPlus, label: 'A seguir', value: profile?.following_count ?? 0 },
    { icon: Newspaper, label: 'Publicações', value: profile?.posts_count ?? 0 },
    { icon: ImageIcon, label: 'Stories', value: profile?.stories_count ?? 0 },
    { icon: ShoppingBag, label: 'Produtos vendidos', value: profile?.products_sold ?? 0 },
    { icon: Star, label: 'Avaliação média', value: profile?.rating ?? '—' },
    { icon: Calendar, label: 'Membro desde', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-PT') : '—' },
  ];

  return (
    <>
      <div className="p-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {/* Capa */}
          <div className="h-28 bg-gradient-to-r from-emerald-600/30 via-cyan-600/20 to-emerald-600/30" />

          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Identidade + ações */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-5 -mt-16">
                  <img
                    src={profile?.avatar_url || '/public/default-avatar.png'}
                    alt={profile?.nome || 'Utilizador'}
                    className="w-28 h-28 rounded-2xl object-cover border-4 border-gray-900 bg-gray-800 shadow-xl shrink-0"
                  />
                  <div className="pt-16 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl font-bold text-white truncate">{profile?.nome || 'Utilizador'}</h2>
                      {profile?.verified && (
                        <span className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-medium px-2 py-0.5 rounded-full">
                          <BadgeCheck size={13} /> Verificado
                        </span>
                      )}
                    </div>
                    {profile?.username && <p className="text-gray-500 text-sm mt-0.5">@{profile.username}</p>}
                  </div>
                </div>

                {profile?.bio && <p className="text-sm text-gray-400 mt-4 leading-relaxed">{profile.bio}</p>}

                {/* Botões de ação */}
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={openChat}
                    className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <MessageCircle size={15} /> Conversar
                  </button>

                  <button
                    onClick={toggleFollow}
                    disabled={followBusy}
                    className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border transition-colors disabled:opacity-50 ${
                      isFollowing
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'
                    }`}
                  >
                    {followBusy ? <Loader2 size={15} className="animate-spin" /> : isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
                    {isFollowing ? 'A seguir' : 'Seguir'}
                  </button>

                  <button
                    onClick={() => setShowDeal(true)}
                    className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-cyan-600/20"
                  >
                    <Handshake size={15} /> Fazer Negócio
                  </button>

                  <button
                    onClick={toggleBlock}
                    disabled={blockBusy}
                    className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border transition-colors disabled:opacity-50 ${
                      isBlocked
                        ? 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25'
                        : 'bg-transparent border-gray-700 text-gray-400 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/10'
                    }`}
                  >
                    {blockBusy ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
                    {isBlocked ? 'Bloqueado' : 'Bloquear'}
                  </button>
                </div>
              </div>

              {/* Painel de negócios */}
              <div className="w-full lg:w-80 shrink-0">
                <BusinessPanel onAction={(a) => alert('Ação: ' + a)} />
              </div>
            </div>

            {/* Abas */}
            <div className="mt-8 border-b border-gray-800">
              <div className="flex flex-wrap gap-1">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`px-4 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-colors ${
                      tab === item.id
                        ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                        : 'border-transparent text-gray-500 hover:text-white hover:bg-gray-800/60'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conteúdo das abas */}
            <div className="mt-5">
              {tab === 'info' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {infoItems.map((item) => (
                    <div key={item.label} className="flex items-center gap-3 bg-gray-800/50 border border-gray-800 rounded-xl p-3.5">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <item.icon size={16} className="text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wide text-gray-600">{item.label}</p>
                        <p className="text-sm text-gray-300 truncate">{item.value || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'stats' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {statItems.map((item) => (
                    <div key={item.label} className="bg-gray-800/50 border border-gray-800 rounded-xl p-4 text-center">
                      <item.icon size={16} className="text-emerald-400 mx-auto mb-2" />
                      <p className="text-lg font-bold text-white">{item.value}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'posts' && (
                <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-8 text-center">
                  <Newspaper size={24} className="text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">As publicações deste utilizador aparecerão aqui.</p>
                </div>
              )}

              {tab === 'stories' && (
                <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-8 text-center">
                  <ImageIcon size={24} className="text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Os stories deste utilizador aparecerão aqui.</p>
                </div>
              )}

              {tab === 'lojas' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stores.length === 0 ? (
                    <div className="md:col-span-2 bg-gray-800/40 border border-gray-800 rounded-xl p-8 text-center">
                      <ShoppingBag size={24} className="text-gray-700 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Nenhuma loja encontrada para este utilizador.</p>
                    </div>
                  ) : stores.map((store) => (
                    <StoreCard key={store.id} store={store} onOpen={() => window.dispatchEvent(new CustomEvent('openStoreProfile', { detail: { id: store.id } }))} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDeal && profile && (
        <DealPanel toId={userId!} onClose={() => setShowDeal(false)} onSent={() => alert('Proposta enviada')} />
      )}
    </>
  );
}
