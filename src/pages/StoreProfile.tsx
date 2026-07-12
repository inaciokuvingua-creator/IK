import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle, ExternalLink, MapPin, MessageCircle, Share2, Star, Store, ThumbsUp } from 'lucide-react';
 
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { firstProductImage } from '../lib/format';
import { buildProductUrl, buildStoreUrl, MARKETPLACE_SHARE_TARGETS, setDocumentMeta, setStructuredData, shareToTarget } from '../lib/marketplace';
import { paymentMethodLabel, type PaymentProfile } from '../lib/paymentProfiles';

type StoreRecord = {
  id: string;
  owner_id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  logo_url: string | null;
  banner_url: string | null;
  verified: boolean;
  categoria: string | null;
  total_sales: number;
  avg_rating: number;
  review_count: number;
  email_contato: string | null;
  whatsapp: string | null;
  localizacao: string | null;
  owner?: { nome: string | null; avatar_url: string | null } | null;
};

type StoreProduct = {
  id: string;
  nome: string;
  preco: number;
  moeda: string;
  imagem_url: string | null;
  descricao?: string | null;
  ativo: boolean;
  destaque: boolean;
  total_vendas: number;
  total_views?: number;
  avg_rating?: number;
  review_count: number;
  slug?: string | null;
  deleted_at?: string | null;
};

type StoreReview = {
  id: string;
  rating: number;
  comment: string | null;
  likes: number;
  seller_reply: string | null;
  created_at: string;
  reviewer?: { nome: string | null; avatar_url: string | null } | null;
};

export default function StoreProfile({ storeId }: { storeId: string | null }) {
  const { user } = useAuth();
  const [store, setStore] = useState<StoreRecord | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [paymentProfiles, setPaymentProfiles] = useState<PaymentProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [savingFollow, setSavingFollow] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [likedReviewIds, setLikedReviewIds] = useState<string[]>([]);

  const storeUrl = store ? buildStoreUrl(store.id, store.slug) : window.location.href;

  const topProducts = useMemo(() => [...products].sort((a, b) => (b.total_vendas || 0) - (a.total_vendas || 0) || (b.review_count || 0) - (a.review_count || 0)).slice(0, 3), [products]);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    (async () => {
      try {
        const { data } = await supabase
          .from('stores')
          .select('*, owner:owner_id(nome,avatar_url), products:products(id,nome,preco,moeda,imagem_url,descricao,ativo,destaque,total_vendas,total_views,avg_rating,review_count,slug,deleted_at)')
          .eq('id', storeId)
          .eq('ativo', true)
          .is('deleted_at', null)
          .maybeSingle();
        const { data: reviewRows } = await supabase.from('store_reviews').select('*, reviewer:reviewer_id(nome,avatar_url)').eq('store_id', storeId).order('created_at', { ascending: false }).limit(12);
        const { data: paymentRows } = await supabase.from('payment_profiles').select('*').eq('owner_type', 'store').eq('store_id', storeId).eq('is_public', true).eq('is_active', true).order('is_default', { ascending: false });
        setStore((data ?? null) as StoreRecord | null);
        setProducts(((data as any)?.products ?? []).filter((item: StoreProduct) => item.ativo && !item.deleted_at));
        setReviews((reviewRows ?? []) as StoreReview[]);
        setPaymentProfiles((paymentRows ?? []) as PaymentProfile[]);
        if (data) {
          setDocumentMeta({
            title: `${data.nome} | IK Finance Marketplace`,
            description: data.descricao ?? `Conheça a loja ${data.nome} no marketplace IK Finance.`,
            keywords: [data.nome, data.categoria ?? 'marketplace', 'ik finance', 'loja'],
            image: data.logo_url,
            url: buildStoreUrl(data.id, data.slug),
          });
          setStructuredData('ik-marketplace-store-schema', {
            '@context': 'https://schema.org',
            '@type': 'Store',
            name: data.nome,
            description: data.descricao,
            image: data.logo_url,
            url: buildStoreUrl(data.id, data.slug),
            address: data.localizacao,
            aggregateRating: (data.review_count ?? 0) > 0 ? {
              '@type': 'AggregateRating',
              ratingValue: data.avg_rating ?? 0,
              reviewCount: data.review_count ?? 0,
            } : undefined,
          });
          window.history.replaceState({}, '', buildStoreUrl(data.id, data.slug));
        }
      } catch (error) {
        console.error('load store profile', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    (async () => {
      try {
        const { data: followCountRow, error: followCountError } = await supabase.rpc('count_store_followers', { store_uuid: storeId });
        if (!followCountError) {
          setFollowCount(Number(followCountRow ?? 0));
        } else {
          const { count } = await supabase.from('store_follows').select('id', { count: 'exact', head: true }).eq('store_id', storeId);
          setFollowCount(count ?? 0);
        }
        if (user) {
          const { data } = await supabase.from('store_follows').select('id').match({ from_id: user.id, store_id: storeId }).maybeSingle();
          setIsFollowing(!!data);
          const { data: likedRows } = await supabase.from('store_review_likes').select('review_id').eq('user_id', user.id);
          setLikedReviewIds((likedRows ?? []).map((row: { review_id: string }) => row.review_id));
        }
      } catch (error) {
        console.error('load follow state', error);
      }
    })();
  }, [storeId, user]);

  const toggleFollowStore = async () => {
    if (!user || !storeId) return alert('Login necessário');
    setSavingFollow(true);
    try {
      if (isFollowing) {
        await supabase.from('store_follows').delete().match({ from_id: user.id, store_id: storeId });
        setIsFollowing(false);
        setFollowCount((count) => Math.max(0, count - 1));
      } else {
        await supabase.from('store_follows').insert({ from_id: user.id, store_id: storeId, created_at: new Date() });
        setIsFollowing(true);
        setFollowCount((count) => count + 1);
      }
    } finally {
      setSavingFollow(false);
    }
  };

  const submitReview = async () => {
    if (!user || !storeId || !reviewRating) return;
    setSubmittingReview(true);
    try {
      await supabase.from('store_reviews').upsert({ store_id: storeId, rating: reviewRating, comment: reviewComment.trim() || null }, { onConflict: 'store_id,reviewer_id' });
      const { data } = await supabase.from('store_reviews').select('*, reviewer:reviewer_id(nome,avatar_url)').eq('store_id', storeId).order('created_at', { ascending: false }).limit(12);
      setReviews((data ?? []) as StoreReview[]);
      setReviewRating(0);
      setReviewComment('');
    } finally {
      setSubmittingReview(false);
    }
  };

  const likeReview = async (reviewId: string, currentLikes: number) => {
    if (!user) return;
    if (likedReviewIds.includes(reviewId)) {
      await supabase.from('store_review_likes').delete().eq('review_id', reviewId).eq('user_id', user.id);
      await supabase.from('store_reviews').update({ likes: Math.max(0, currentLikes - 1) }).eq('id', reviewId);
      setLikedReviewIds((prev) => prev.filter((id) => id !== reviewId));
      setReviews((prev) => prev.map((review) => review.id === reviewId ? { ...review, likes: Math.max(0, review.likes - 1) } : review));
      return;
    }
    await supabase.from('store_review_likes').upsert({ review_id: reviewId, user_id: user.id }, { onConflict: 'review_id,user_id', ignoreDuplicates: true });
    await supabase.from('store_reviews').update({ likes: currentLikes + 1 }).eq('id', reviewId);
    setLikedReviewIds((prev) => [...prev, reviewId]);
    setReviews((prev) => prev.map((review) => review.id === reviewId ? { ...review, likes: review.likes + 1 } : review));
  };

  if (!storeId) return <div className="p-6">Loja não encontrada.</div>;
  if (loading) return <div className="p-6">A carregar loja...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => window.dispatchEvent(new CustomEvent('navigatePage', { detail: { page: 'marketplace' } }))} className="btn btn-ghost text-sm px-4 py-2">
          ← Voltar ao Marketplace
        </button>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShareOpen((value) => !value)} className="btn btn-sm bg-gray-800 hover:bg-gray-700 text-white"><Share2 size={14} /> Partilhar</button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('openUserProfile', { detail: { id: store?.owner_id } }))} className="btn btn-sm bg-gray-800 hover:bg-gray-700 text-white">
            Ver perfil do proprietário
          </button>
        </div>
      </div>

      {shareOpen && (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5">
          <p className="text-white font-semibold mb-3">Partilhar esta loja</p>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mb-4">
            {MARKETPLACE_SHARE_TARGETS.map((target) => (
              <button key={target.id} onClick={() => shareToTarget(target.id, storeUrl, store?.nome ?? 'Loja IK Finance', store?.descricao ?? undefined)} className="rounded-2xl bg-gray-800 border border-gray-700 px-2 py-3 text-xs text-gray-300 hover:text-white hover:border-gray-600">
                <div className="text-lg mb-1">{target.icon}</div>
                {target.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-emerald-400 break-all">{storeUrl}</div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
        <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${store?.banner_url || store?.logo_url || '/public/store-banner.png'})` }} />
        <div className="p-6">
          <div className="flex flex-col lg:flex-row items-start gap-5">
            <img src={store?.logo_url || '/public/default-store.png'} alt="logo" className="w-28 h-28 rounded-3xl border border-gray-800 object-cover" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{store?.nome}</h1>
                {store?.verified && <span className="text-emerald-400 text-sm inline-flex items-center gap-1"><CheckCircle size={14} /> Verificada</span>}
              </div>
              <p className="text-gray-400 max-w-3xl">{store?.descricao}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-400">
                <div>{followCount} seguidor{followCount === 1 ? '' : 'es'}</div>
                <div className="inline-flex items-center gap-1"><Star size={14} className="text-amber-400" /> {(store?.avg_rating ?? 0).toFixed(1)} · {store?.review_count ?? 0} avaliações</div>
                <div className="inline-flex items-center gap-1"><Building2 size={14} /> {store?.categoria || 'Geral'}</div>
                {store?.localizacao && <div className="inline-flex items-center gap-1"><MapPin size={14} /> {store.localizacao}</div>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {user?.id !== store?.owner_id && (
                  <button onClick={toggleFollowStore} disabled={savingFollow} className={`btn btn-sm ${isFollowing ? 'bg-gray-700 text-white' : 'bg-emerald-500 text-white'} ${savingFollow ? 'opacity-70 cursor-not-allowed' : ''}`}>
                    {isFollowing ? 'Seguindo loja' : 'Seguir loja'}
                  </button>
                )}
                <button className="btn btn-sm bg-gray-800 hover:bg-gray-700 text-white" onClick={() => { window.dispatchEvent(new CustomEvent('openChatWith', { detail: { id: store?.owner_id } })); window.dispatchEvent(new CustomEvent('openChat')); }}>
                  <MessageCircle size={14} /> Conversar com fornecedor
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-4">Produtos públicos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.length === 0 ? (
                <div className="text-gray-500">Nenhum produto disponível.</div>
              ) : products.map((product) => {
                const image = firstProductImage(product.imagem_url);
                const productUrl = buildProductUrl(product.id, product.slug);
                return (
                  <button key={product.id} onClick={() => window.dispatchEvent(new CustomEvent('openMarketplaceProduct', { detail: { id: product.id } }))} className="text-left bg-gray-950 border border-gray-800 rounded-3xl overflow-hidden hover:border-emerald-600 transition-colors">
                    <img src={image || '/public/default-product.png'} alt={product.nome} className="h-40 w-full object-cover" />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white font-semibold truncate">{product.nome}</p>
                        {product.destaque && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">Destaque</span>}
                      </div>
                      <p className="text-gray-400 text-sm mt-2 h-10 overflow-hidden">{product.descricao || 'Produto sem descrição detalhada.'}</p>
                      <div className="mt-4 flex items-center justify-between text-sm text-gray-300">
                        <span>{product.preco?.toFixed(2)} {product.moeda}</span>
                        <span>{product.total_vendas || 0} vendas</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <span>{(product.avg_rating ?? 0).toFixed(1)} estrelas</span>
                        <a href={productUrl} onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300">
                          Link público <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-semibold">Avaliações da loja</h2>
            {user && user.id !== store?.owner_id && (
              <div className="rounded-2xl bg-gray-950 border border-gray-800 p-4 space-y-3">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button key={value} onClick={() => setReviewRating(value)} className={`text-xl ${value <= reviewRating ? 'text-amber-400' : 'text-gray-600'}`}>★</button>
                  ))}
                </div>
                <textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} rows={3} placeholder="Comente a experiência com a loja" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none" />
                <button onClick={submitReview} disabled={submittingReview || !reviewRating} className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold disabled:opacity-50">{submittingReview ? 'A publicar...' : 'Publicar avaliação'}</button>
              </div>
            )}
            {reviews.length === 0 ? <p className="text-gray-500 text-sm">Ainda não existem avaliações públicas para esta loja.</p> : reviews.map((review) => (
              <div key={review.id} className="rounded-2xl bg-gray-950 border border-gray-800 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-200 font-semibold">{review.reviewer?.nome?.[0]?.toUpperCase() ?? 'U'}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-white font-medium text-sm">{review.reviewer?.nome ?? 'Utilizador'}</p>
                        <p className="text-amber-400 text-xs">{'★'.repeat(review.rating)}{'☆'.repeat(Math.max(0, 5 - review.rating))}</p>
                      </div>
                      <span className="text-gray-500 text-xs">{new Date(review.created_at).toLocaleDateString('pt-AO')}</span>
                    </div>
                    {review.comment && <p className="text-gray-300 text-sm mt-2">{review.comment}</p>}
                    <div className="flex items-center gap-3 mt-3 text-xs">
                      <button onClick={() => likeReview(review.id, review.likes)} className="text-gray-400 hover:text-white inline-flex items-center gap-1"><ThumbsUp size={12} /> {review.likes}</button>
                    </div>
                    {review.seller_reply && (
                      <div className="mt-3 pl-3 border-l-2 border-emerald-700 text-xs text-emerald-200 bg-emerald-950/20 rounded-r-xl p-3">
                        <p className="font-semibold mb-1">Resposta do vendedor</p>
                        <p>{review.seller_reply}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5">
            <h3 className="font-semibold mb-3">Sobre a loja</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div>Email: {store?.email_contato || 'Não informado'}</div>
              <div>WhatsApp: {store?.whatsapp || 'Não informado'}</div>
              <div>Localização: {store?.localizacao || 'Não informado'}</div>
              <div>Proprietário: {store?.owner?.nome || 'Não informado'}</div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5">
            <h3 className="font-semibold mb-3">Métodos de pagamento</h3>
            <div className="space-y-3 text-sm text-gray-300">
              {paymentProfiles.length === 0 ? <p className="text-gray-500 text-sm">O fornecedor vai enviar os detalhes de pagamento na conversa privada.</p> : paymentProfiles.map((profile) => (
                <div key={profile.id} className="rounded-2xl bg-gray-950 border border-gray-800 p-3">
                  <p className="text-white text-sm font-medium">{profile.label}</p>
                  <p className="text-gray-500 text-xs mt-1">{paymentMethodLabel(profile.method_type)}</p>
                  <p className="text-gray-300 text-xs mt-2 whitespace-pre-wrap">{[profile.provider_name, profile.account_name, profile.account_number, profile.phone_number, profile.wallet_network, profile.wallet_address, profile.currency_code].filter(Boolean).join(' · ')}</p>
                  {profile.instructions && <p className="text-gray-400 text-xs mt-2 whitespace-pre-wrap">{profile.instructions}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5">
            <h3 className="font-semibold mb-3">Destaques</h3>
            <div className="space-y-3">
              {topProducts.length === 0 ? <p className="text-gray-500 text-sm">Sem destaques ainda.</p> : topProducts.map((product) => (
                <button key={product.id} onClick={() => window.dispatchEvent(new CustomEvent('openMarketplaceProduct', { detail: { id: product.id } }))} className="w-full text-left rounded-2xl bg-gray-950 border border-gray-800 p-3 hover:border-emerald-600 transition-colors">
                  <p className="text-white text-sm font-medium truncate">{product.nome}</p>
                  <p className="text-gray-500 text-xs mt-1">{product.total_vendas} vendas · {(product.avg_rating ?? 0).toFixed(1)} estrelas</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5">
            <h3 className="font-semibold mb-3">Ações</h3>
            <button className="btn w-full" onClick={() => { window.dispatchEvent(new CustomEvent('openChatWith', { detail: { id: store?.owner_id } })); window.dispatchEvent(new CustomEvent('openChat')); }}>Conversar com proprietário</button>
          </div>
        </aside>
      </div>
    </div>
  );
}