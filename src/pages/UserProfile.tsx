import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import BusinessPanel from '../components/Community/BusinessPanel';
import DealPanel from '../components/DealPanel';
import StoreCard from '../components/StoreCard';
import { useAuth } from '../context/AuthContext';

export default function UserProfile({ userId }: { userId: string | null }) {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'info' | 'stats' | 'posts' | 'stories' | 'lojas'>('info');
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
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

  if (!userId) return <div className="p-6">Selecione um utilizador</div>;

  return (
    <>
      <div className="p-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-start gap-6">
            <img src={profile?.avatar_url || '/public/default-avatar.png'} className="w-28 h-28 rounded-full object-cover" />
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold">{profile?.nome || 'Utilizador'}</h2>
                {profile?.verified && <span className="text-amber-400">● Verificado</span>}
              </div>
              <p className="text-sm text-gray-400 mt-2">{profile?.bio}</p>
              <div className="mt-3 flex gap-2">
                <button className="btn" onClick={() => { window.dispatchEvent(new CustomEvent('openChatWith', { detail: { id: userId } })); window.dispatchEvent(new CustomEvent('openChat')); }}>Conversar</button>
                <button className="btn" onClick={async () => {
                  if (!user) return alert('Login necessário');
                  try {
                    if (isFollowing) {
                      await supabase.from('follows').delete().match({ from_id: user.id, to_id: userId });
                      setIsFollowing(false);
                    } else {
                      await supabase.from('follows').insert({ from_id: user.id, to_id: userId, created_at: new Date() });
                      setIsFollowing(true);
                    }
                  } catch (e) { console.error(e); }
                }}>{isFollowing ? 'A seguir' : 'Seguir'}</button>
                <button className="btn" onClick={async () => {
                  if (!user) return alert('Login necessário');
                  try {
                    if (isBlocked) {
                      await supabase.from('blocks').delete().match({ blocker_id: user.id, blocked_id: userId });
                      setIsBlocked(false);
                    } else {
                      await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: userId, created_at: new Date() });
                      setIsBlocked(true);
                    }
                  } catch (e) { console.error(e); }
                }}>{isBlocked ? 'Bloqueado' : 'Bloquear'}</button>
                <button className="btn" onClick={() => setShowDeal(true)}>Fazer Negócio</button>
              </div>
            </div>
            <div className="w-80">
              <BusinessPanel onAction={(a) => alert('Ação: ' + a)} />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex gap-3">
              <button className={`btn btn-ghost ${tab === 'info' ? 'btn-active' : ''}`} onClick={() => setTab('info')}>Info</button>
              <button className={`btn btn-ghost ${tab === 'stats' ? 'btn-active' : ''}`} onClick={() => setTab('stats')}>Estatísticas</button>
              <button className={`btn btn-ghost ${tab === 'posts' ? 'btn-active' : ''}`} onClick={() => setTab('posts')}>Publicações</button>
              <button className={`btn btn-ghost ${tab === 'stories' ? 'btn-active' : ''}`} onClick={() => setTab('stories')}>Stories</button>
              <button className={`btn btn-ghost ${tab === 'lojas' ? 'btn-active' : ''}`} onClick={() => setTab('lojas')}>As minhas lojas</button>
            </div>

            <div className="mt-4">
              {tab === 'info' && (
                <div>
                  <h4 className="font-semibold">Informações</h4>
                  <div className="mt-2 text-sm text-gray-400">
                    <div>País: {profile?.country}</div>
                    <div>Cidade: {profile?.city}</div>
                    <div>Idiomas: {profile?.languages}</div>
                    <div>Contactos: {profile?.phone}</div>
                    <div>Empresa: {profile?.company}</div>
                    <div>Profissão: {profile?.profession}</div>
                  </div>
                </div>
              )}

              {tab === 'stats' && (
                <div>
                  <h4 className="font-semibold">Estatísticas</h4>
                  <div className="mt-2 text-sm text-gray-400">
                    <div>Seguidores: {profile?.followers_count || 0}</div>
                    <div>Seguindo: {profile?.following_count || 0}</div>
                    <div>Publicações: {profile?.posts_count || 0}</div>
                    <div>Stories: {profile?.stories_count || 0}</div>
                    <div>Produtos vendidos: {profile?.products_sold || 0}</div>
                    <div>Avaliação média: {profile?.rating || '—'}</div>
                    <div>Tempo na plataforma: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</div>
                  </div>
                </div>
              )}

              {tab === 'posts' && (
                <div>
                  <h4 className="font-semibold">Publicações</h4>
                  <div className="mt-3">
                    {/* reuse posts table */}
                  </div>
                </div>
              )}

              {tab === 'stories' && (
                <div>
                  <h4 className="font-semibold">Stories</h4>
                  <div className="mt-3">{/* stories grid */}</div>
                </div>
              )}

              {tab === 'lojas' && (
                <div>
                  <h4 className="font-semibold">As minhas lojas</h4>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stores.length === 0 ? (
                      <div className="text-gray-500">Nenhuma loja encontrada para este utilizador.</div>
                    ) : stores.map((store) => (
                      <StoreCard key={store.id} store={store} onOpen={() => window.dispatchEvent(new CustomEvent('openStoreProfile', { detail: { id: store.id } }))} />
                    ))}
                  </div>
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
