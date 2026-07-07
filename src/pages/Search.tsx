import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { firstProductImage } from '../lib/format';

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
        setProfiles([]);
        setStores([]);
        setProducts([]);
        setPosts([]);
        return;
      }

      setLoading(true);
      const q = `%${query.trim()}%`;

      const safe = async (promise: Promise<any>) => {
        try {
          const result = await promise;
          return result.data || [];
        } catch (_e) {
          return [];
        }
      };

      const [profileResults, storeResults, productResults, postResults] = await Promise.all([
        safe(
          supabase
            .from('user_profiles')
            .select('id,nome,bio,avatar_url,company,profession,country')
            .or(`nome.ilike.${q},bio.ilike.${q},company.ilike.${q},profession.ilike.${q}`)
            .limit(12)
        ),
        safe(
          supabase
            .from('stores')
            .select('id,nome,descricao,logo_url,verified,categoria,owner_id')
            .or(`nome.ilike.${q},descricao.ilike.${q},categoria.ilike.${q}`)
            .limit(12)
        ),
        safe(
          supabase
            .from('products')
            .select('id,nome,preco,moeda,imagem_url,store_id')
            .or(`nome.ilike.${q},descricao.ilike.${q}`)
            .limit(16)
        ),
        safe(
          supabase
            .from('posts')
            .select('id,title,content,created_at')
            .or(`title.ilike.${q},content.ilike.${q}`)
            .limit(12)
        ),
      ]);

      setProfiles(profileResults);
      setStores(storeResults);
      setProducts(productResults);
      setPosts(postResults);
      setLoading(false);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query]);

  return (
      <div className="p-6">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
          <div className="flex flex-col gap-2 mb-6">
            <h1 className="text-2xl font-bold">Pesquisa</h1>
            <p className="text-gray-400 text-sm">Encontre pessoas, lojas, produtos e publicações em toda a plataforma.</p>
          </div>
          <div className="grid gap-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar pessoas, lojas, produtos, posts..."
              className="w-full bg-gray-950 border border-gray-800 rounded-3xl px-5 py-4 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid gap-4 mt-6">
          <section className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Utilizadores</h2>
                <p className="text-gray-500 text-sm">{profiles.length} resultado{profiles.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            {loading && query.trim() ? (
              <div className="text-gray-500">A pesquisar...</div>
            ) : profiles.length === 0 ? (
              <div className="text-gray-500">Nenhum utilizador encontrado.</div>
            ) : (
              <div className="grid gap-3">
                {profiles.map((profile) => (
                  <div key={profile.id} className="bg-gray-950 border border-gray-800 rounded-3xl p-4 flex items-center gap-3">
                    <img src={profile.avatar_url || '/public/default-avatar.png'} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{profile.nome || 'Usuário'}</p>
                      <p className="text-gray-500 text-sm truncate">{profile.company || profile.profession || profile.country || 'Sem dados'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => window.dispatchEvent(new CustomEvent('openUserProfile', { detail: { id: profile.user_id || profile.id } }))}
                        className="btn btn-sm bg-emerald-500 text-white">
                        Abrir
                      </button>
                      <button onClick={() => {
                        const targetId = profile.user_id || profile.id;
                        if (targetId) {
                          window.dispatchEvent(new CustomEvent('openChatWith', { detail: { id: targetId } }));
                          window.dispatchEvent(new CustomEvent('openChat'));
                        }
                      }}
                        className="btn btn-sm bg-gray-700 text-white">
                        Conversar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Lojas</h2>
                <p className="text-gray-500 text-sm">{stores.length} resultado{stores.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            {loading && query.trim() ? (
              <div className="text-gray-500">A pesquisar...</div>
            ) : stores.length === 0 ? (
              <div className="text-gray-500">Nenhuma loja encontrada.</div>
            ) : (
              <div className="grid gap-3">
                {stores.map((store) => (
                  <div key={store.id} className="bg-gray-950 border border-gray-800 rounded-3xl p-4 flex items-center gap-3">
                    <img src={store.logo_url || '/public/default-store.png'} alt="logo" className="w-12 h-12 rounded-2xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{store.nome}</p>
                      <p className="text-gray-500 text-sm truncate">{store.categoria || 'Geral'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => window.dispatchEvent(new CustomEvent('openStoreProfile', { detail: { id: store.id } }))}
                        className="btn btn-sm bg-emerald-500 text-white">
                        Abrir
                      </button>
                      {store.owner_id && (
                        <button onClick={() => {
                          window.dispatchEvent(new CustomEvent('openChatWith', { detail: { id: store.owner_id } }));
                          window.dispatchEvent(new CustomEvent('openChat'));
                        }}
                          className="btn btn-sm bg-gray-700 text-white">
                          Conversar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Produtos</h2>
                <p className="text-gray-500 text-sm">{products.length} resultado{products.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            {loading && query.trim() ? (
              <div className="text-gray-500">A pesquisar...</div>
            ) : products.length === 0 ? (
              <div className="text-gray-500">Nenhum produto encontrado.</div>
            ) : (
              <div className="grid gap-3">
                {products.map((product) => (
                  <div key={product.id} className="bg-gray-950 border border-gray-800 rounded-3xl p-4 flex items-center gap-3">
                    <img src={firstProductImage(product.imagem_url) || '/public/default-product.png'} alt="produto" className="w-16 h-16 rounded-2xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{product.nome}</p>
                      <p className="text-gray-500 text-sm">{product.preco?.toFixed(2)} {product.moeda}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => window.dispatchEvent(new CustomEvent('openMarketplaceProduct', { detail: { id: product.id } }))}
                        className="btn btn-sm bg-emerald-500 text-white">
                        Produto
                      </button>
                      <button onClick={() => window.dispatchEvent(new CustomEvent('openStoreProfile', { detail: { id: product.store_id } }))}
                        className="btn btn-sm bg-gray-700 text-white">
                        Loja
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Publicações</h2>
                <p className="text-gray-500 text-sm">{posts.length} resultado{posts.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            {loading && query.trim() ? (
              <div className="text-gray-500">A pesquisar...</div>
            ) : posts.length === 0 ? (
              <div className="text-gray-500">Nenhuma publicação encontrada.</div>
            ) : (
              <div className="grid gap-3">
                {posts.map((post) => (
                  <div key={post.id} className="bg-gray-950 border border-gray-800 rounded-3xl p-4">
                    <p className="text-white font-semibold truncate">{post.title || 'Publicação'}</p>
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">{post.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
  );
}
