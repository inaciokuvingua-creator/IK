import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Search, Users, Filter, X, BadgeCheck, RefreshCw, UserPlus, Globe, Building2, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import CommunityFeed from '../components/Community/CommunityFeed';

type UserRow = {
  user_id: string;
  nome: string;
  full_name: string | null;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  country: string | null;
  city: string | null;
  province: string | null;
  verified: boolean;
  account_type: string | null;
  plan: string | null;
  company_name: string | null;
};

const ACCOUNT_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'personal', label: 'Pessoal' },
  { value: 'business', label: 'Negócio' },
  { value: 'creator', label: 'Criador' },
  { value: 'store', label: 'Loja' },
];

const ACCOUNT_ICONS: Record<string, React.ElementType> = {
  personal: Users,
  business: Building2,
  creator: BadgeCheck,
  store: ShoppingBag,
};

function UserCard({ user }: { user: UserRow }) {
  const Icon = ACCOUNT_ICONS[user.account_type ?? 'personal'] ?? Users;
  const displayName = user.display_name ?? user.full_name ?? user.nome ?? 'Utilizador';
  const location = [user.city, user.country].filter(Boolean).join(', ');

  return (
    <div
      onClick={() => window.dispatchEvent(new CustomEvent('openUserProfile', { detail: { id: user.user_id } }))}
      className="cursor-pointer flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800/50 transition-colors group"
    >
      {user.avatar_url ? (
        <img src={user.avatar_url} alt={displayName} className="w-11 h-11 rounded-full object-cover shrink-0 border border-gray-700" />
      ) : (
        <div className="w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg shrink-0 border border-emerald-900/40">
          {displayName[0]?.toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-white truncate group-hover:text-emerald-300 transition-colors">
            {displayName}
          </span>
          {user.verified && <BadgeCheck size={13} className="text-amber-400 shrink-0" />}
        </div>
        {user.username && (
          <p className="text-xs text-gray-500 truncate">@{user.username}</p>
        )}
        {location && (
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <Globe size={10} /> {location}
          </p>
        )}
      </div>
      <Icon size={14} className="text-gray-600 shrink-0" />
    </div>
  );
}

export default function Comunidades() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState('');
  const [accountType, setAccountType] = useState('');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState<'pessoas' | 'feed'>('pessoas');
  const pageRef = useRef(0);
  const LIMIT = 24;

  const loadUsers = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const page = reset ? 0 : pageRef.current;
      let builder = supabase
        .from('user_profiles')
        .select('user_id,nome,full_name,display_name,username,bio,avatar_url,country,city,province,verified,account_type,plan,company_name')
        .neq('user_id', user?.id ?? '')
        .order('updated_at', { ascending: false });

      if (query.trim()) {
        const q = `%${query.trim()}%`;
        builder = builder.or(`nome.ilike.${q},display_name.ilike.${q},username.ilike.${q},bio.ilike.${q},company_name.ilike.${q},country.ilike.${q},city.ilike.${q}`);
      }
      if (accountType) builder = builder.eq('account_type', accountType);
      if (onlyVerified) builder = builder.eq('verified', true);

      const { data } = await builder.range(page * LIMIT, page * LIMIT + LIMIT - 1);
      const rows = (data ?? []) as UserRow[];
      if (reset) setUsers(rows);
      else setUsers(prev => [...prev, ...rows]);
      setHasMore(rows.length === LIMIT);
      pageRef.current = page + 1;
    } catch (e) {
      console.error('Comunidades load error', e);
    } finally {
      setLoading(false);
    }
  }, [query, accountType, onlyVerified, user?.id]);

  useEffect(() => {
    pageRef.current = 0;
    loadUsers(true);
  }, [query, accountType, onlyVerified]);

  const hasFilters = accountType || onlyVerified;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users size={22} className="text-emerald-400" /> Comunidades
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Conecte-se com pessoas, criadores e negócios</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {(['pessoas', 'feed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {t === 'pessoas' ? '👥 Pessoas' : '📰 Feed'}
          </button>
        ))}
      </div>

      {tab === 'pessoas' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Sidebar filtros */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <Filter size={14} className="text-emerald-400" /> Filtros
                </p>
                {hasFilters && (
                  <button onClick={() => { setAccountType(''); setOnlyVerified(false); }} className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1">
                    <X size={11} /> Limpar
                  </button>
                )}
              </div>

              {/* Tipo de conta */}
              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Tipo de conta</p>
                <div className="space-y-1">
                  {ACCOUNT_TYPES.map(at => (
                    <button
                      key={at.value}
                      onClick={() => setAccountType(at.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${accountType === at.value ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-300' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                    >
                      {at.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verificados */}
              <div>
                <button
                  onClick={() => setOnlyVerified(v => !v)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${onlyVerified ? 'bg-amber-950/40 border-amber-800 text-amber-300' : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:border-gray-600'}`}
                >
                  <BadgeCheck size={14} />
                  Apenas verificados
                </button>
              </div>
            </div>
          </div>

          {/* Lista de utilizadores */}
          <div className="lg:col-span-3 space-y-4">
            {/* Barra de pesquisa */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                placeholder="Pesquisar pessoas, lojas, empresas..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-700 placeholder-gray-600"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              {loading && users.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-16">
                  <Users size={32} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Nenhum utilizador encontrado</p>
                  <p className="text-gray-600 text-xs mt-1">Tente ajustar os filtros ou a pesquisa</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y divide-x divide-gray-800/60">
                    {users.map(u => (
                      <div key={u.user_id} className="p-1">
                        <UserCard user={u} />
                      </div>
                    ))}
                  </div>
                  {hasMore && (
                    <div className="p-4 border-t border-gray-800 text-center">
                      <button
                        onClick={() => loadUsers(false)}
                        disabled={loading}
                        className="flex items-center gap-2 mx-auto text-sm text-gray-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Carregar mais
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'feed' && (
        <CommunityFeed query={query} />
      )}
    </div>
  );
}
