import { useEffect, useState } from 'react';
import { Search as SearchIcon, Users, Store, Package, FileText, MessageCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { firstProductImage } from '../lib/format';

function Avatar({ src, name, size = 12 }: { src?: string | null; name?: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return <img src={src} alt={name ?? ''} onError={() => setErr(true)}
      className={`w-${size} h-${size} rounded-full object-cover shrink-0 border border-gray-700`} />;
  }
  return (
    <div className={`w-${size} h-${size} rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0 border border-emerald-900/40`}>
      {(name ?? 'U')[0]?.toUpperCase()}
    </div>
  );
}

function StoreImg({ src, name }: { src?: string | null; name?: string }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return <img src={src} alt={name ?? ''} onError={() => setErr(true)}
      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-700" />;
  }
  return (
    <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center shrink-0 border border-gray-700">
      <Store size={20} className="text-gray-500" />
    </div>
  );
}

function ProductImg({ src, name }: { src?: string | null; name?: string }) {
  const [err, setErr] = useState(false);
  const imgSrc = firstProductImage(src);
  if (imgSrc && !err) {
    return <img src={imgSrc} alt={name ?? ''} onError={() => setErr(true)}
      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-700" />;
  }
  return (
    <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center shrink-0 border border-gray-700">
      <Package size={20} className="text-gray-500" />
    </div>
  );
}

const BTN_PRIMARY = 'flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors';
const BTN_GHOST   = 'flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors border border-gray-700';

export default function Search() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      if (!query.trim()) {
        setProfiles([]); setStores([]); setProducts([]); setPosts([]);
        return;
      }
      setLoading(true);
      const q = `%${query.trim()}%`;
      const safe = async <T,>(query: PromiseLike<{ data: T[] | null }>) => {
        try {
          return (await query).data ?? [];
        } catch {
          return [] as T[];
        }
      };

      const [profileResults, storeResults, productResults, postResults] = await Promise.all([
        safe(supabase.from('user_profiles')
          .select('user_id,nome,display_name,bio,avatar_url,city,country,verified')
          .or(`nome.ilike.${q},display_name.ilike.${q},bio.ilike.${q},country.ilike.${q},city.ilike.${q}`)
          .limit(12)),
        safe(supabase.from('stores')
          .select('id,nome,descricao,logo_url,verified,categoria,owner_id')
          .or(`nome.ilike.${q},descricao.ilike.${q},categoria.ilike.${q}`)
          .limit(12)),
        safe(supabase.from('products')
          .select('id,nome,preco,moeda,imagem_url,store_id')
          .or(`nome.ilike.${q}`)
          .eq('ativo', true)
          .limit(16)),
        safe(supabase.from('posts')
          .select('id,title,content,created_at,author_nome')
          .or(`title.ilike.${q},content.ilike.${q}`)
          .limit(12)),
      ]);

      setProfiles(profileResults);
      setStores(storeResults);
      setProducts(productResults);
      setPosts(postResults);
      setLoading(false);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [query]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SearchIcon size={22} className="text-emerald-400" /> Pesquisa Global
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Encontre pessoas, lojas, produtos e publicações</p>
      </div>

      <div className="relative">
        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar em toda a plataforma..."
          autoFocus
          className="w-full bg-gray-900 border border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-white text-sm focus:outline-none focus:border-emerald-700 placeholder-gray-600"
        />
        {loading && (
          <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
        )}
      </div>

      {!query.trim() ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <SearchIcon size={40} className="text-gray-700 mb-4" />
          <p className="text-gray-500 text-base font-medium">Escreva para pesquisar</p>
          <p className="text-gray-600 text-sm mt-1">Pessoas · Lojas · Produtos · Publicações</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Utilizadores */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800">
              <Users size={16} className="text-emerald-400" />
              <h2 className="font-semibold text-white">Utilizadores</h2>
              <span className="ml-auto text-xs text-gray-500">{profiles.length} resultados</span>
            </div>
            {profiles.length === 0 ? (
              <p className="text-gray-600 text-sm px-5 py-4">Nenhum utilizador encontrado.</p>
            ) : (
              <div className="divide-y divide-gray-800/60">
                {profiles.map((p) => (
                  <div key={p.user_id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar src={p.avatar_url} name={p.display_name ?? p.nome} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{p.display_name ?? p.nome ?? 'Utilizador'}</p>
                      <p className="text-gray-500 text-xs truncate">{[p.city, p.country].filter(Boolean).join(', ') || p.bio || ''}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => window.dispatchEvent(new CustomEvent('openUserProfile', { detail: { id: p.user_id } }))}
                        className={BTN_PRIMARY}>Ver perfil</button>
                      {p.user_id !== user?.id && (
                        <button onClick={() => { window.dispatchEvent(new CustomEvent('openChatWith', { detail: { id: p.user_id } })); }}
                          className={BTN_GHOST}><MessageCircle size={12} /> Chat</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lojas */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800">
              <Store size={16} className="text-emerald-400" />
              <h2 className="font-semibold text-white">Lojas</h2>
              <span className="ml-auto text-xs text-gray-500">{stores.length} resultados</span>
            </div>
            {stores.length === 0 ? (
              <p className="text-gray-600 text-sm px-5 py-4">Nenhuma loja encontrada.</p>
            ) : (
              <div className="divide-y divide-gray-800/60">
                {stores.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <StoreImg src={s.logo_url} name={s.nome} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{s.nome}</p>
                      <p className="text-gray-500 text-xs truncate">{s.categoria ?? 'Geral'}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => window.dispatchEvent(new CustomEvent('openStoreProfile', { detail: { id: s.id } }))}
                        className={BTN_PRIMARY}>Ver loja</button>
                      {s.owner_id && (
                        <button onClick={() => window.dispatchEvent(new CustomEvent('openChatWith', { detail: { id: s.owner_id } }))}
                          className={BTN_GHOST}><MessageCircle size={12} /> Chat</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Produtos */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800">
              <Package size={16} className="text-emerald-400" />
              <h2 className="font-semibold text-white">Produtos</h2>
              <span className="ml-auto text-xs text-gray-500">{products.length} resultados</span>
            </div>
            {products.length === 0 ? (
              <p className="text-gray-600 text-sm px-5 py-4">Nenhum produto encontrado.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y divide-gray-800/60">
                {products.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-800/40 transition-colors"
                    onClick={() => window.dispatchEvent(new CustomEvent('openMarketplaceProduct', { detail: { id: p.id } }))}>
                    <ProductImg src={p.imagem_url} name={p.nome} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{p.nome}</p>
                      <p className="text-emerald-400 text-xs font-semibold">{p.preco?.toLocaleString('pt-AO')} {p.moeda}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Publicações */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800">
              <FileText size={16} className="text-emerald-400" />
              <h2 className="font-semibold text-white">Publicações</h2>
              <span className="ml-auto text-xs text-gray-500">{posts.length} resultados</span>
            </div>
            {posts.length === 0 ? (
              <p className="text-gray-600 text-sm px-5 py-4">Nenhuma publicação encontrada.</p>
            ) : (
              <div className="divide-y divide-gray-800/60">
                {posts.map((p) => (
                  <div key={p.id} className="px-5 py-3">
                    <p className="text-white text-sm font-medium">{p.title || 'Publicação'}</p>
                    {p.author_nome && <p className="text-emerald-500 text-xs mt-0.5">por {p.author_nome}</p>}
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">{p.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
