import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import {
  Search, Filter, Grid3X3, List, Star, ShoppingBag, Heart,
  MessageCircle, Share2, Download, Play, Pause, ZoomIn,
  X, ChevronLeft, ChevronRight, ExternalLink, MapPin,
  Package, Shield, Clock, Eye, BarChart2, Tag, Layers,
  CheckCircle, XCircle, AlertCircle, Upload, Trash2,
  Copy, Check, Send, Paperclip, Phone, Globe, Mail,
  Image as ImageIcon, FileText, Volume2, Film, RefreshCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { firstProductImage, parseProductImages } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useAnimation } from '../context/AnimationContext';
import { useNotifications } from '../context/NotificationContext';
import {
  MARKETPLACE_SHARE_TARGETS,
  buildProductUrl,
  buildStoreUrl,
  formatReviewScore,
  setDocumentMeta,
  setStructuredData,
  shareToTarget,
  slugify,
} from '../lib/marketplace';
import { checkMarketplaceRateLimit, queueMarketplaceModeration } from '../lib/marketplaceGuardrails';
import { buildPaymentInstructions, type PaymentProfile } from '../lib/paymentProfiles';

// ── Types ─────────────────────────────────────────────────────────────────────
type Store = {
  id: string; owner_id: string; slug: string; nome: string;
  descricao: string | null; logo_url: string | null; banner_url: string | null;
  categoria: string; verified: boolean; ativo: boolean;
  rating: number; total_sales: number; avg_rating: number; review_count: number;
  localizacao: string | null; whatsapp: string | null; email_contato: string | null;
  meta_title?: string | null; meta_description?: string | null;
  deleted_at: string | null;
};

type Product = {
  id: string; store_id: string; owner_id: string; nome: string;
  descricao: string | null; preco: number; moeda: string;
  tipo: 'digital' | 'physical'; categoria: string; subcategoria: string | null;
  marca: string | null; imagem_url: string | null; arquivo_url: string | null;
  estoque: number | null; ativo: boolean; destaque: boolean;
  total_vendas: number; total_views: number; total_downloads: number;
  avg_rating: number; review_count: number;
  disponibilidade: string; localizacao: string | null;
  peso: number | null; dimensoes: object | null;
  transportadora: string | null; tempo_entrega: string | null;
  formatos: string[] | null; tags: string[] | null;
  slug?: string | null; meta_title?: string | null; meta_description?: string | null; seo_keywords?: string[] | null;
  allow_download?: boolean;
  deleted_at: string | null; created_at: string;
  stores?: { nome: string; slug: string; verified: boolean; logo_url: string | null; owner_id?: string | null; ativo?: boolean; deleted_at?: string | null };
};

type ProductMedia = {
  id: string; product_id: string; type: 'image' | 'video' | 'audio' | 'document';
  url: string; mime: string | null; name: string | null; size: number | null;
  duration: number | null; sort_order: number;
};

type Review = {
  id: string; product_id: string; reviewer_id: string; rating: number;
  comment: string | null; photo_urls: string[]; likes: number;
  seller_reply: string | null; verified_purchase: boolean; created_at: string;
  profiles?: { nome: string; avatar_url: string | null };
};

type Order = {
  id: string; buyer_id: string; store_id: string; product_id: string;
  quantidade: number; preco_unitario: number; total: number; moeda: string;
  status: string; notes: string | null; proof_url: string | null;
  approved_at: string | null; download_released: boolean;
  conversation_id: string | null; created_at: string;
  products?: { nome: string; imagem_url: string | null; tipo: string };
  stores?: { nome: string };
};

type DownloadToken = {
  id: string; order_id: string; product_id: string; buyer_id: string;
  token: string; expires_at: string | null; max_downloads: number;
  download_count: number; last_download: string | null; revoked: boolean; created_at: string;
  products?: { nome: string; arquivo_url: string | null };
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const CATS = ['todos','software','musica','ebooks','cursos','templates','fotos','videos','dados','fisico','outro'];
const CAT_LABELS: Record<string, string> = {
  todos: 'Todos', software: 'Software', musica: 'Música', ebooks: 'E-Books',
  cursos: 'Cursos', templates: 'Templates', fotos: 'Fotos/Arte',
  videos: 'Vídeos', dados: 'Dados', fisico: 'Físico', outro: 'Outro',
};
function formatSize(b: number) {
  if (b < 1024) return `${b}B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)}KB`;
  return `${(b/1048576).toFixed(1)}MB`;
}
function formatDur(s: number) {
  const m = Math.floor(s/60).toString().padStart(2,'0');
  return `${m}:${(s%60).toString().padStart(2,'0')}`;
}
function stars(n: number) {
  return Array.from({length:5},(_,i)=>i < Math.round(n) ? '★' : '☆').join('');
}

// ── Audio Player ──────────────────────────────────────────────────────────────
function AudioPlayer({ url, name, duration }: { url: string; name?: string | null; duration?: number | null }) {
  const ref   = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed]      = useState(1);
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3">
      <audio ref={ref} src={url}
        onTimeUpdate={() => { const a=ref.current; if(a) setProgress(a.currentTime/a.duration*100); }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <button onClick={() => {
        const a=ref.current; if(!a) return;
        if(playing){a.pause();setPlaying(false);}else{a.play();setPlaying(true);}
      }} className="w-10 h-10 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 transition-colors">
        {playing ? <Pause size={16}/> : <Play size={16}/>}
      </button>
      <div className="flex-1 min-w-0">
        {name && <p className="text-white text-xs font-medium truncate mb-1">{name}</p>}
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden cursor-pointer"
          onClick={e => {
            const a=ref.current; if(!a) return;
            const rect=(e.currentTarget as HTMLElement).getBoundingClientRect();
            const pct=(e.clientX-rect.left)/rect.width;
            a.currentTime=a.duration*pct;
          }}>
          <div className="h-full bg-emerald-400 rounded-full transition-all" style={{width:`${progress}%`}}/>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-gray-600 text-xs">
            {ref.current ? formatDur(Math.floor(ref.current.currentTime)) : '0:00'}
          </span>
          <span className="text-gray-600 text-xs">{duration ? formatDur(duration) : ''}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        <select value={speed} onChange={e => {
          const v=+e.target.value; setSpeed(v);
          if(ref.current) ref.current.playbackRate=v;
        }} className="bg-gray-700 border border-gray-600 text-gray-300 text-xs rounded-lg px-1.5 py-0.5">
          {speeds.map(s=><option key={s} value={s}>{s}x</option>)}
        </select>
        <a href={url} download className="flex items-center justify-center text-gray-500 hover:text-emerald-400 transition-colors">
          <Download size={13}/>
        </a>
      </div>
    </div>
  );
}

// ── Star Rating ───────────────────────────────────────────────────────────────
function StarRating({ value, onChange, readonly=false, size='md' }: { value: number; onChange?: (v:number)=>void; readonly?: boolean; size?: 'sm'|'md'|'lg' }) {
  const [hover, setHover] = useState(0);
  const sz = {sm:14, md:18, lg:24}[size];
  return (
    <div className="flex">
      {[1,2,3,4,5].map(i => (
        <button key={i} disabled={readonly}
          onMouseEnter={() => !readonly && setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange?.(i)}
          className={`transition-transform ${!readonly ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}`}>
          <Star size={sz} fill={i<=(hover||value)?'#f59e0b':'none'} className={i<=(hover||value)?'text-amber-400':'text-gray-600'}/>
        </button>
      ))}
    </div>
  );
}

// ── Share modal ───────────────────────────────────────────────────────────────
function ShareModal({ url, title, onClose }: { url: string; title: string; onClose: ()=>void }) {
  const [copied, setCopied] = useState(false);
  const full = url;

  const share = async (id: string) => {
    await shareToTarget(id as any, full, title, title);
    if (id === 'copy') {
      setCopied(true);
      setTimeout(()=>setCopied(false),2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-5 anim-slide-up" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Partilhar</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={16}/></button>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4 max-h-72 overflow-y-auto pr-1">
          {MARKETPLACE_SHARE_TARGETS.map(t => (
            <button key={t.id} onClick={() => share(t.id)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 transition-all hover:scale-105">
              <span className="text-xl">{t.id==='copy' && copied ? '✅' : t.icon}</span>
              <span className="text-gray-400 text-xs">{t.id==='copy' && copied ? 'Copiado' : t.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
          <input readOnly value={full} className="flex-1 bg-transparent text-gray-400 text-xs focus:outline-none truncate"/>
          <button onClick={() => share('copy')} className="text-emerald-400 hover:text-emerald-300">
            {copied ? <Check size={14}/> : <Copy size={14}/>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Product Detail Modal ───────────────────────────────────────────────────────
function ProductModal({
  product, onClose, onContactSupplier, userId,
}: {
  product: Product; onClose: ()=>void; onContactSupplier: (p:Product)=>void; userId?: string;
}) {
  const { format } = useCurrency();
  const [media, setMedia]       = useState<ProductMedia[]>([]);
  const [reviews, setReviews]   = useState<Review[]>([]);
  const [imgIdx, setImgIdx]     = useState(0);
  const [zoom, setZoom]         = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isFav, setIsFav]       = useState(false);
  const [tab, setTab]           = useState<'info'|'media'|'reviews'>('info');
  const [likedReviewIds, setLikedReviewIds] = useState<string[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

  const productUrl = buildProductUrl(product.id, product.slug ?? slugify(product.nome));
  const isSupplierOwner = userId != null && product.stores?.owner_id === userId;
  const imgUrls = useMemo(() => parseProductImages(product.imagem_url ?? null), [product.imagem_url]);
  const allImages = useMemo(() => [
    ...imgUrls.map((u) => ({ url: u, type: 'image' as const })),
    ...media.filter((m) => m.type === 'image').map((m) => ({ url: m.url, type: 'image' as const })),
  ], [imgUrls, media]);
  const avgRating = useMemo(
    () => (reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : product.avg_rating),
    [reviews, product.avg_rating],
  );

  useEffect(() => {
    supabase.from('product_views').insert({ product_id: product.id, viewer_id: userId ?? null });
    supabase.from('product_media').select('*').eq('product_id', product.id).order('sort_order').then(({ data }) => setMedia(data ?? []));
    supabase.from('product_reviews').select('*, profiles:reviewer_id(nome,avatar_url)').eq('product_id', product.id).order('created_at', { ascending: false }).limit(20).then(({ data }) => setReviews(data as any ?? []));
    if (userId) {
      supabase.from('product_favourites').select('id').eq('product_id', product.id).eq('user_id', userId).maybeSingle().then(({ data }) => setIsFav(!!data));
      supabase.from('product_review_likes').select('review_id').eq('user_id', userId).then(({ data }) => setLikedReviewIds((data ?? []).map((row: any) => row.review_id)));
    }
  }, [product.id, userId]);

  useEffect(() => {
    window.history.replaceState({}, '', productUrl);
    setDocumentMeta({
      title: product.meta_title ?? `${product.nome} | IK Finance Marketplace`,
      description: product.meta_description ?? product.descricao ?? `Produto ${product.nome} disponível no marketplace IK Finance.`,
      keywords: product.seo_keywords ?? [product.categoria, product.subcategoria ?? '', product.marca ?? ''].filter(Boolean),
      image: firstProductImage(product.imagem_url),
      url: productUrl,
    });
    setStructuredData('ik-marketplace-product-schema', {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.nome,
      description: product.descricao,
      image: allImages.map((item) => item.url),
      brand: product.marca ? { '@type': 'Brand', name: product.marca } : undefined,
      offers: {
        '@type': 'Offer',
        price: product.preco,
        priceCurrency: product.moeda,
        availability: product.disponibilidade === 'disponivel' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: productUrl,
      },
      aggregateRating: reviews.length > 0 ? {
        '@type': 'AggregateRating',
        ratingValue: avgRating,
        reviewCount: reviews.length,
      } : undefined,
    });
    return () => {
      const resetUrl = new URL(window.location.href);
      resetUrl.searchParams.delete('view');
      resetUrl.searchParams.delete('product');
      resetUrl.searchParams.delete('slug');
      window.history.replaceState({}, '', resetUrl.toString());
    };
  }, [allImages, avgRating, product, productUrl, reviews.length]);

  const imgSrc = allImages[imgIdx]?.url ?? firstProductImage(product.imagem_url);

  const toggleFav = async () => {
    if (!userId) return;
    if (isFav) {
      await supabase.from('product_favourites').delete().eq('product_id',product.id).eq('user_id',userId);
      setIsFav(false);
    } else {
      await supabase.from('product_favourites').insert({ product_id: product.id });
      setIsFav(true);
    }
  };

  const submitReview = async () => {
    if (!myRating || !userId) return;
    const limit = await checkMarketplaceRateLimit({ action: 'product_review', limit: 5, windowMs: 60 * 60 * 1000, userId, metadata: { productId: product.id } });
    if (!limit.allowed) {
      alert('Limite temporário de avaliações atingido. Tente novamente mais tarde.');
      return;
    }
    setSubmitting(true);
    const { data: saved } = await supabase.from('product_reviews').upsert({
      product_id: product.id, store_id: product.store_id,
      rating: myRating, comment: myComment.trim() || null,
    }, { onConflict: 'product_id,reviewer_id' }).select('id').single();
    if (saved?.id) {
      await queueMarketplaceModeration({ entityType: 'review', entityId: saved.id, ownerId: userId, summary: `Nova avaliação em ${product.nome}`, priority: myRating <= 2 ? 'high' : 'normal', metadata: { rating: myRating } });
    }
    const {data} = await supabase.from('product_reviews').select('*, profiles:reviewer_id(nome,avatar_url)').eq('product_id',product.id).order('created_at',{ascending:false}).limit(20);
    setReviews(data as any ?? []);
    if (product.stores?.owner_id && product.stores.owner_id !== userId) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const session = await supabase.auth.getSession();
      await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json',
          Apikey: anonKey,
        },
        body: JSON.stringify({
          titulo: 'Nova avaliação recebida',
          corpo: `${product.nome} recebeu uma nova avaliação de ${myRating} estrela(s).`,
          tipo: 'marketplace_review',
          userId: product.stores.owner_id,
          url: productUrl,
        }),
      });
    }
    setMyRating(0); setMyComment(''); setSubmitting(false);
  };

  const toggleReviewLike = async (reviewId: string) => {
    if (!userId) return;
    const liked = likedReviewIds.includes(reviewId);
    if (liked) {
      await supabase.from('product_review_likes').delete().eq('review_id', reviewId).eq('user_id', userId);
      setLikedReviewIds((prev) => prev.filter((id) => id !== reviewId));
      setReviews((prev) => prev.map((review) => review.id === reviewId ? { ...review, likes: Math.max(0, review.likes - 1) } : review));
      return;
    }
    await supabase.from('product_review_likes').upsert({ review_id: reviewId, user_id: userId }, { onConflict: 'review_id,user_id', ignoreDuplicates: true });
    setLikedReviewIds((prev) => [...prev, reviewId]);
    setReviews((prev) => prev.map((review) => review.id === reviewId ? { ...review, likes: review.likes + 1 } : review));
  };

  const saveSellerReply = async (reviewId: string) => {
    if (!isSupplierOwner) return;
    setSubmittingReplyId(reviewId);
    const reply = (replyDrafts[reviewId] ?? '').trim();
    await supabase.from('product_reviews').update({ seller_reply: reply || null, seller_reply_at: reply ? new Date().toISOString() : null }).eq('id', reviewId);
    setReviews((prev) => prev.map((review) => review.id === reviewId ? { ...review, seller_reply: reply || null } : review));
    const review = reviews.find((item) => item.id === reviewId);
    if (review?.reviewer_id) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const session = await supabase.auth.getSession();
      await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json',
          Apikey: anonKey,
        },
        body: JSON.stringify({
          titulo: 'O vendedor respondeu à sua avaliação',
          corpo: `${product.nome} recebeu uma resposta do vendedor.`,
          tipo: 'marketplace_review',
          userId: review.reviewer_id,
          url: productUrl,
        }),
      });
    }
    setSubmittingReplyId(null);
  };


  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden anim-modal" onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-gray-800 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-lg leading-tight truncate">{product.nome}</p>
            <p className="text-gray-500 text-sm">{product.stores?.nome ?? ''}</p>
          </div>
          <button onClick={() => setShowShare(true)} className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"><Share2 size={15}/></button>
          <button onClick={toggleFav} className={`w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors ${isFav?'text-red-400':'text-gray-400 hover:text-red-400'}`}><Heart size={15} fill={isFav?'currentColor':'none'}/></button>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"><X size={15}/></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Image gallery */}
          {allImages.length > 0 && (
            <div className="relative bg-gray-950 aspect-video flex items-center justify-center shrink-0">
              <img src={imgSrc!} alt={product.nome} className="w-full h-full object-contain cursor-zoom-in" onClick={()=>setZoom(true)}/>
              {allImages.length > 1 && (
                <>
                  <button onClick={()=>setImgIdx(i=>Math.max(0,i-1))} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white"><ChevronLeft size={16}/></button>
                  <button onClick={()=>setImgIdx(i=>Math.min(allImages.length-1,i+1))} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white"><ChevronRight size={16}/></button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {allImages.map((_,i)=><button key={i} onClick={()=>setImgIdx(i)} className={`w-2 h-2 rounded-full transition-colors ${i===imgIdx?'bg-white':'bg-white/40'}`}/>)}
                  </div>
                </>
              )}
              <button onClick={()=>setZoom(true)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white"><ZoomIn size={14}/></button>
            </div>
          )}

          {/* Thumbnail strip */}
          {allImages.length > 1 && (
            <div className="flex gap-2 px-5 py-2 overflow-x-auto">
              {allImages.map((img,i)=>(
                <button key={i} onClick={()=>setImgIdx(i)} className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors shrink-0 ${i===imgIdx?'border-emerald-500':'border-transparent'}`}>
                  <img src={img.url} alt="" className="w-full h-full object-cover"/>
                </button>
              ))}
            </div>
          )}

          {/* Price + action */}
          <div className="px-5 py-4 flex items-center gap-4 border-b border-gray-800">
            <div className="flex-1">
              <p className="text-2xl font-bold text-white">{format(product.preco)}</p>
              <div className="flex items-center gap-2 mt-1">
                <StarRating value={Math.round(avgRating)} readonly size="sm"/>
                <span className="text-gray-500 text-xs">({reviews.length} avaliações)</span>
                {product.destaque && <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full font-medium">Destaque</span>}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => onContactSupplier(product)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors btn-liquid btn-ripple">
                <MessageCircle size={15}/> Conversar com o Fornecedor
              </button>
              {product.tipo === 'digital' && (
                <p className="text-gray-600 text-xs text-center">Entrega digital imediata após pagamento</p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-800 px-5">
            {(['info','media','reviews'] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab===t?'text-emerald-400 border-emerald-500':'text-gray-500 border-transparent hover:text-gray-300'}`}>
                {t==='info'?'Informações':t==='media'?`Média (${media.length})`:`Avaliações (${reviews.length})`}
              </button>
            ))}
          </div>

          {/* Info tab */}
          {tab === 'info' && (
            <div className="p-5 space-y-5">
              {product.descricao && <p className="text-gray-300 text-sm leading-relaxed">{product.descricao}</p>}

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Categoria', CAT_LABELS[product.categoria] ?? product.categoria],
                  ...(product.subcategoria ? [['Subcategoria', product.subcategoria]] : []),
                  ...(product.marca ? [['Marca', product.marca]] : []),
                  ['Tipo', product.tipo === 'digital' ? 'Digital' : 'Físico'],
                  ['Disponibilidade', product.disponibilidade === 'disponivel' ? '✅ Disponível' : product.disponibilidade === 'esgotado' ? '❌ Esgotado' : product.disponibilidade],
                  ...(product.localizacao ? [['Localização', product.localizacao]] : []),
                  ...(product.tempo_entrega ? [['Entrega', product.tempo_entrega]] : []),
                  ...(product.transportadora ? [['Transportadora', product.transportadora]] : []),
                ].map(([k, v], i) => (
                  <div key={i} className="bg-gray-800/50 rounded-xl p-3">
                    <p className="text-gray-500 text-xs mb-0.5">{k}</p>
                    <p className="text-white text-sm font-medium">{v}</p>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {([
                  { Icon: Eye, val: product.total_views, label: 'Visualizações' },
                  { Icon: Download, val: product.total_downloads, label: 'Downloads' },
                  { Icon: ShoppingBag, val: product.total_vendas, label: 'Vendas' },
                ] as Array<{ Icon: LucideIcon; val: number; label: string }>).map(({ Icon, val, label }, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center mb-1 text-gray-500">
                      <Icon size={16}/>
                    </div>
                    <p className="text-white font-bold text-lg">{val}</p>
                    <p className="text-gray-600 text-xs">{label}</p>
                  </div>
                ))}
              </div>

              {/* Formats */}
              {product.formatos && product.formatos.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Formatos incluídos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.formatos.map((f,i)=>(
                      <span key={i} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs px-2.5 py-1 rounded-full">{f}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {product.tags.map((t,i)=>(
                    <span key={i} className="bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-xs px-2.5 py-1 rounded-full">#{t}</span>
                  ))}
                </div>
              )}

              {/* Supplier info */}
              {product.stores && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Fornecedor</p>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center shrink-0">
                        <ShoppingBag size={18} className="text-gray-400"/>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-white font-semibold text-sm">{product.stores.nome}</p>
                          {product.stores.verified && <CheckCircle size={13} className="text-emerald-400"/>}
                        </div>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('openStoreProfile', { detail: { id: product.store_id } })); }}
                      className="w-full text-left text-xs text-emerald-400 hover:text-emerald-200 font-medium transition-colors">
                      Ver loja
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Media tab */}
          {tab === 'media' && (
            <div className="p-5 space-y-4">
              {media.length === 0 && <p className="text-gray-600 text-sm text-center py-8">Sem conteúdo adicional</p>}
              {media.filter(m=>m.type==='video').map(m=>(
                <div key={m.id}>
                  <p className="text-xs text-gray-500 mb-2">{m.name ?? 'Vídeo'}</p>
                  <video src={m.url} controls className="w-full rounded-2xl max-h-56 bg-gray-950"/>
                </div>
              ))}
              {media.filter(m=>m.type==='audio').map(m=>(
                <AudioPlayer key={m.id} url={m.url} name={m.name} duration={m.duration}/>
              ))}
              {media.filter(m=>m.type==='document').map(m=>(
                <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gray-800 border border-gray-700 rounded-2xl hover:border-gray-600 transition-colors">
                  <FileText size={20} className="text-gray-400 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{m.name ?? 'Documento'}</p>
                    {m.size && <p className="text-gray-500 text-xs">{formatSize(m.size)}</p>}
                  </div>
                  <Download size={14} className="text-gray-500"/>
                </a>
              ))}
            </div>
          )}

          {/* Reviews tab */}
          {tab === 'reviews' && (
            <div className="p-5 space-y-4">
              {/* Summary */}
              {reviews.length > 0 && (
                <div className="bg-gray-800/50 rounded-2xl p-4 flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-white">{avgRating.toFixed(1)}</p>
                    <StarRating value={Math.round(avgRating)} readonly size="sm"/>
                    <p className="text-gray-500 text-xs mt-1">{reviews.length} avaliações</p>
                  </div>
                  <div className="flex-1">
                    {[5,4,3,2,1].map(s=>{
                      const cnt = reviews.filter(r=>r.rating===s).length;
                      const pct = reviews.length ? (cnt/reviews.length*100) : 0;
                      return (
                        <div key={s} className="flex items-center gap-2 mb-1">
                          <span className="text-gray-500 text-xs w-2">{s}</span>
                          <Star size={10} className="text-amber-400 shrink-0"/>
                          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{width:`${pct}%`}}/>
                          </div>
                          <span className="text-gray-600 text-xs w-4">{cnt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Write review */}
              {userId && (
                <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-4">
                  <p className="text-white text-sm font-medium mb-3">A sua avaliação</p>
                  <StarRating value={myRating} onChange={setMyRating} size="lg"/>
                  <textarea value={myComment} onChange={e=>setMyComment(e.target.value)} rows={3}
                    placeholder="Escreva um comentário..." className="w-full mt-3 bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 placeholder-gray-600 resize-none"/>
                  <button onClick={submitReview} disabled={!myRating||submitting}
                    className="mt-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-xl btn-liquid btn-ripple transition-colors">
                    {submitting ? 'A publicar...' : 'Publicar avaliação'}
                  </button>
                </div>
              )}

              {/* Review list */}
              {reviews.map(r=>(
                <div key={r.id} className="border-b border-gray-800 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-300 shrink-0">
                      {(r.profiles as any)?.nome?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium">{(r.profiles as any)?.nome ?? 'Utilizador'}</span>
                        {r.verified_purchase && <span className="text-emerald-400 text-xs flex items-center gap-0.5"><CheckCircle size={10}/> Compra verificada</span>}
                      </div>
                      <StarRating value={r.rating} readonly size="sm"/>
                      {r.comment && <p className="text-gray-300 text-sm mt-1.5 leading-relaxed">{r.comment}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <button onClick={() => toggleReviewLike(r.id)} className={`text-xs transition-colors ${likedReviewIds.includes(r.id) ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}>
                          Curtir ({r.likes})
                        </button>
                      </div>
                      {r.seller_reply && (
                        <div className="mt-2 pl-3 border-l-2 border-emerald-700 bg-emerald-950/20 rounded-r-lg p-2">
                          <p className="text-emerald-400 text-xs font-medium mb-1">Resposta do vendedor</p>
                          <p className="text-gray-300 text-xs">{r.seller_reply}</p>
                        </div>
                      )}
                      {isSupplierOwner && (
                        <div className="mt-2 flex gap-2">
                          <input value={replyDrafts[r.id] ?? r.seller_reply ?? ''} onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))} placeholder="Responder avaliação" className="flex-1 bg-gray-800 border border-gray-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500" />
                          <button onClick={() => saveSellerReply(r.id)} disabled={submittingReplyId === r.id} className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold disabled:opacity-50">
                            {submittingReplyId === r.id ? '...' : 'Responder'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen zoom */}
      {zoom && imgSrc && (
        <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center" onClick={()=>setZoom(false)}>
          <img src={imgSrc} alt="" className="max-w-full max-h-full object-contain" onClick={e=>e.stopPropagation()}/>
          <button onClick={()=>setZoom(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"><X size={20}/></button>
        </div>
      )}

      {/* Share modal */}
      {showShare && <ShareModal url={productUrl} title={product.nome} onClose={()=>setShowShare(false)}/>} 
    </div>
  );
}

// ── Contact Supplier Modal ─────────────────────────────────────────────────────
function ContactSupplierModal({
  product, userId, onClose, onNavigateChat,
}: { product: Product; userId: string; onClose: ()=>void; onNavigateChat: ()=>void }) {
  const { format } = useCurrency();
  const { sendNotification } = useNotifications();
  const [step, setStep]       = useState<'intro'|'message'|'done'>('intro');
  const [message, setMessage] = useState(`Olá! Tenho interesse em "${product.nome}" por ${format(product.preco)}. Podemos combinar os detalhes do pagamento?`);
  const [sending, setSending] = useState(false);

  const startConversation = async () => {
    setSending(true);
    try {
      const rateLimit = await checkMarketplaceRateLimit({ action: 'marketplace_conversation', limit: 12, windowMs: 60 * 60 * 1000, userId, metadata: { productId: product.id } });
      if (!rateLimit.allowed) {
        setSending(false);
        alert('Muitas solicitações em pouco tempo. Aguarde antes de iniciar nova conversa.');
        return;
      }
      // Get store owner
      const { data: store } = await supabase.from('stores').select('owner_id').eq('id', product.store_id).maybeSingle();
      if (!store) throw new Error('Loja não encontrada');
      const supplierId = store.owner_id;
      if (supplierId === userId) { onClose(); return; }

      const { data: paymentProfiles } = await supabase
        .from('payment_profiles')
        .select('*')
        .eq('owner_type', 'store')
        .eq('store_id', product.store_id)
        .eq('is_active', true)
        .order('is_default', { ascending: false });
      const paymentInstructions = buildPaymentInstructions((paymentProfiles ?? []) as PaymentProfile[]);

      // Find or create DM conversation
      let convId: string | null = null;
      const { data: myParts } = await supabase.from('chat_participants').select('conversation_id').eq('user_id', userId).is('left_at', null);
      if (myParts?.length) {
        const ids = myParts.map(p => p.conversation_id);
        const { data: convs } = await supabase.from('chat_conversations').select('id').eq('type','direct').in('id', ids);
        if (convs?.length) {
          for (const c of convs) {
            const { data: other } = await supabase.from('chat_participants').select('id').eq('conversation_id', c.id).eq('user_id', supplierId).maybeSingle();
            if (other) { convId = c.id; break; }
          }
        }
      }

      if (!convId) {
        const { data: conv } = await supabase.from('chat_conversations').insert({ type: 'direct', created_by: userId }).select().single();
        if (!conv) throw new Error('Falha ao criar conversa');
        convId = conv.id;
        await supabase.from('chat_participants').insert([
          { conversation_id: convId, user_id: userId,     role: 'admin' },
          { conversation_id: convId, user_id: supplierId, role: 'member' },
        ]);
      }

      // Create order in pending state
      const { data: order } = await supabase.from('orders').insert({
        store_id: product.store_id, product_id: product.id,
        preco_unitario: product.preco, total: product.preco,
        moeda: product.moeda, status: 'pending',
        notes: paymentInstructions,
        conversation_id: convId,
      }).select().single();

      // Send initial message with product context
      await supabase.from('chat_messages').insert({
        conversation_id: convId,
        type: 'text',
        content: `🛍️ *Interesse em produto*\n\nProduto: ${product.nome}\nPreço: ${format(product.preco)}\n\n${message}`,
      });
      if ((paymentProfiles ?? []).length > 0) {
        await supabase.from('chat_messages').insert({
          conversation_id: convId,
          type: 'text',
          content: `💳 *Métodos de pagamento disponíveis*\n\n${paymentInstructions}`,
        });
      }
      if (order?.id) {
        await queueMarketplaceModeration({ entityType: 'message', entityId: order.id, ownerId: userId, summary: `Conversa iniciada sobre ${product.nome}`, metadata: { conversationId: convId, productId: product.id } });
      }

      await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);
      await sendNotification(
        'Nova solicitação de compra',
        `Há um comprador interessado em ${product.nome}. Abra a conversa para negociar o pagamento manual.`,
        'marketplace_purchase',
        { userId: supplierId, url: buildProductUrl(product.id, product.slug ?? slugify(product.nome)) }
      );
      window.dispatchEvent(new CustomEvent('openChatWith', { detail: { id: supplierId } }));
      setStep('done');
    } catch {
      setSending(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-8 text-center anim-modal" onClick={e=>e.stopPropagation()}>
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-400"/>
          </div>
          <h3 className="text-white font-bold text-xl mb-2">Conversa iniciada!</h3>
          <p className="text-gray-400 text-sm mb-6">O fornecedor foi contactado. Pode acompanhar a conversa no Chat.</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800 transition-colors text-sm">Fechar</button>
            <button onClick={onNavigateChat} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl text-sm btn-liquid btn-ripple transition-colors">Ir para Chat</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 anim-modal" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-semibold">Contactar Fornecedor</h3>
            <p className="text-gray-500 text-xs mt-0.5">{product.nome}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={18}/></button>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3">
            {firstProductImage(product.imagem_url) ? <img src={firstProductImage(product.imagem_url)!} alt="" className="w-12 h-12 rounded-xl object-cover"/> : <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center"><Package size={20} className="text-gray-500"/></div>}
            <div>
              <p className="text-white font-medium text-sm">{product.nome}</p>
              <p className="text-emerald-400 font-bold">{format(product.preco)}</p>
            </div>
          </div>
        </div>

        <label className="block text-xs text-gray-500 mb-1.5">Mensagem inicial</label>
        <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4}
          className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500 mb-4 resize-none placeholder-gray-600"/>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 text-sm py-2.5 rounded-xl hover:bg-gray-800 transition-colors">Cancelar</button>
          <button onClick={startConversation} disabled={sending}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl btn-liquid btn-ripple transition-colors flex items-center justify-center gap-2">
            {sending ? <><RefreshCw size={14} className="animate-spin"/>A enviar...</> : <><Send size={14}/>Enviar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── My Orders / Downloads panel ────────────────────────────────────────────────
function BuyerPanel({ userId, onNavigateChat }: { userId: string; onNavigateChat: ()=>void }) {
  const { format } = useCurrency();
  const { sendNotification } = useNotifications();
  const [orders, setOrders]           = useState<Order[]>([]);
  const [tokens, setTokens]           = useState<DownloadToken[]>([]);
  const [tab, setTab]                 = useState<'orders'|'downloads'|'favourites'|'conversations'|'reviews'>('orders');
  const [favs, setFavs]               = useState<any[]>([]);
  const [reviews, setReviews]         = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [proofFile, setProofFile]     = useState<File | null>(null);
  const [proofNote, setProofNote]     = useState('');
  const [sendingProof, setSendingProof] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from('orders').select('*, products:product_id(nome,imagem_url,tipo), stores:store_id(nome,owner_id)').eq('buyer_id', userId).order('created_at',{ascending:false}),
      supabase.from('download_tokens').select('*, products:product_id(nome,arquivo_url)').eq('buyer_id', userId).order('created_at',{ascending:false}),
      supabase.from('product_favourites').select('*, products:product_id(*)').eq('user_id', userId),
      supabase.from('product_reviews').select('*, products:product_id(nome)').eq('reviewer_id', userId).order('created_at', { ascending: false }),
    ]).then(([o, d, f, r]) => {
      setOrders(o.data as Order[] ?? []);
      setTokens(d.data as DownloadToken[] ?? []);
      setFavs(f.data ?? []);
      setReviews(r.data ?? []);
      setLoading(false);
    });
  }, [userId]);

  const openConversationChat = async (conversationId: string) => {
    const { data } = await supabase.from('chat_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', userId)
      .limit(1);
    const otherId = (data as any[])?.[0]?.user_id;
    if (otherId) {
      window.dispatchEvent(new CustomEvent('openChatWith', { detail: { id: otherId } }));
      window.dispatchEvent(new CustomEvent('openChat'));
    } else if ((orders.find(o => o.conversation_id === conversationId)?.stores as any)?.owner_id) {
      const ownerId = (orders.find(o => o.conversation_id === conversationId)?.stores as any)?.owner_id;
      if (ownerId) {
        window.dispatchEvent(new CustomEvent('openChatWith', { detail: { id: ownerId } }));
        window.dispatchEvent(new CustomEvent('openChat'));
      }
    }
  };

  const sendProof = async (orderId: string) => {
    if (!proofFile) return;
    const rateLimit = await checkMarketplaceRateLimit({ action: 'payment_proof_upload', limit: 8, windowMs: 60 * 60 * 1000, userId, metadata: { orderId } });
    if (!rateLimit.allowed) {
      alert('Muitos comprovativos enviados em pouco tempo. Aguarde antes de tentar novamente.');
      return;
    }
    setSendingProof(true);
    const path = `${userId}/proofs/${orderId}/${Date.now()}-${proofFile.name}`;
    const { data } = await supabase.storage.from('marketplace-media').upload(path, proofFile);
    if (!data) { setSendingProof(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('marketplace-media').getPublicUrl(path);
    await supabase.from('order_proofs').insert({ order_id: orderId, url: publicUrl, mime: proofFile.type, name: proofFile.name, note: proofNote });
    await queueMarketplaceModeration({ entityType: 'proof', entityId: orderId, ownerId: userId, summary: `Novo comprovativo enviado para o pedido ${orderId}`, priority: 'normal', metadata: { fileName: proofFile.name } });
    await supabase.from('orders').update({ proof_url: publicUrl, status: 'paid' }).eq('id', orderId);
    const currentOrder = orders.find((order) => order.id === orderId);
    const supplierId = (currentOrder?.stores as any)?.owner_id as string | undefined;
    if (supplierId) {
      await sendNotification(
        'Novo comprovativo enviado',
        `O comprador enviou um comprovativo para ${(currentOrder?.products as any)?.nome ?? 'um pedido'}.`,
        'marketplace_payment',
        { userId: supplierId, url: buildProductUrl(currentOrder?.product_id ?? '', undefined) }
      );
    }
    setOrders(prev => prev.map(o => o.id===orderId ? {...o, status:'paid', proof_url: publicUrl} : o));
    setProofFile(null); setProofNote(''); setSendingProof(false); setSelectedOrder(null);
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-500/20 text-amber-400',
      paid: 'bg-blue-500/20 text-blue-400',
      delivered: 'bg-emerald-500/20 text-emerald-400',
      cancelled: 'bg-red-500/20 text-red-400',
    };
    const labels: Record<string,string> = { pending:'Pendente', paid:'Pago', delivered:'Entregue', cancelled:'Cancelado' };
    return <span className={`${map[s]??'bg-gray-700 text-gray-400'} text-xs font-medium px-2.5 py-1 rounded-full`}>{labels[s]??s}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-800 rounded-2xl p-1">
        {(['orders','downloads','favourites','conversations','reviews'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors ${tab===t?'bg-emerald-500 text-white':'text-gray-400 hover:text-gray-200'}`}>
            {t==='orders'?'Pedidos':t==='downloads'?'Downloads':t==='favourites'?'Favoritos':t==='conversations'?'Conversas':'Avaliações'}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/></div>}

      {!loading && tab==='orders' && (
        <div className="space-y-3">
          {orders.length===0 && <p className="text-gray-600 text-sm text-center py-8">Sem pedidos ainda</p>}
          {orders.map(o=>(
            <div key={o.id} className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                {firstProductImage((o.products as any)?.imagem_url)
                  ? <img src={firstProductImage((o.products as any)?.imagem_url)!} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0"/>
                  : <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center shrink-0"><Package size={20} className="text-gray-500"/></div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-white font-medium text-sm truncate">{(o.products as any)?.nome ?? 'Produto'}</p>
                    {statusBadge(o.status)}
                  </div>
                  <p className="text-gray-500 text-xs">{(o.stores as any)?.nome ?? ''}</p>
                  <p className="text-emerald-400 text-sm font-bold mt-1">{format(o.total)}</p>
                </div>
              </div>
              {/* Actions */}
              <div className="flex gap-2 mt-3">
                {o.status === 'pending' && !o.proof_url && (
                  <button onClick={()=>setSelectedOrder(selectedOrder===o.id?null:o.id)}
                    className="flex items-center gap-1.5 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-1.5 rounded-xl transition-colors">
                    <Upload size={12}/> Enviar Comprovativo
                  </button>
                )}
                {o.download_released && (
                  <button onClick={()=>{}}
                    className="flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-xl transition-colors">
                    <Download size={12}/> Download Liberado
                  </button>
                )}
                {o.conversation_id && (
                  <button onClick={() => o.conversation_id && openConversationChat(o.conversation_id)}
                    className="flex items-center gap-1.5 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 px-3 py-1.5 rounded-xl transition-colors">
                    <MessageCircle size={12}/> Chat
                  </button>
                )}
              </div>
              {o.notes && (
                <div className="mt-3 p-3 bg-gray-900 rounded-xl border border-gray-700">
                  <p className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider mb-2">Informações para pagamento</p>
                  <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed">{o.notes}</p>
                </div>
              )}
              {/* Proof upload */}
              {selectedOrder===o.id && (
                <div className="mt-3 p-3 bg-gray-900 rounded-xl border border-gray-700 space-y-2">
                  <input ref={fileRef} type="file" className="hidden" onChange={e=>setProofFile(e.target.files?.[0]??null)}/>
                  <button onClick={()=>fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-600 hover:border-emerald-600 rounded-xl py-3 text-gray-500 hover:text-emerald-400 text-xs transition-colors flex items-center justify-center gap-2">
                    <Paperclip size={14}/>{proofFile ? proofFile.name : 'Selecionar comprovativo'}
                  </button>
                  <textarea value={proofNote} onChange={e=>setProofNote(e.target.value)} rows={2} placeholder="Referência do pagamento (opcional)"
                    className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 placeholder-gray-600 resize-none"/>
                  <button onClick={()=>sendProof(o.id)} disabled={!proofFile||sendingProof}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-xs font-semibold py-2 rounded-xl btn-liquid btn-ripple transition-colors">
                    {sendingProof ? 'A enviar...' : 'Enviar Comprovativo'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && tab==='downloads' && (
        <div className="space-y-3">
          {tokens.length===0 && <p className="text-gray-600 text-sm text-center py-8">Sem downloads disponíveis</p>}
          {tokens.map(tk=>{
            const expired = tk.expires_at && new Date(tk.expires_at) < new Date();
            const exhausted = tk.download_count >= tk.max_downloads;
            const disabled = tk.revoked || !!expired || exhausted;
            return (
              <div key={tk.id} className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{(tk.products as any)?.nome ?? 'Produto'}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {tk.download_count}/{tk.max_downloads} downloads usados
                      {tk.expires_at && ` · Expira ${new Date(tk.expires_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  {disabled
                    ? <span className="text-xs text-red-400 font-medium">{tk.revoked?'Revogado':expired?'Expirado':'Esgotado'}</span>
                    : <a href={(tk.products as any)?.arquivo_url ?? '#'} target="_blank" rel="noopener noreferrer"
                        onClick={async ()=>{
                          const now = new Date().toISOString();
                          await supabase.from('download_tokens').update({
                            download_count:tk.download_count+1,
                            last_download: now,
                            last_device: navigator.platform,
                          }).eq('id',tk.id);
                          await supabase.from('download_token_logs').insert({
                            download_token_id: tk.id,
                            order_id: tk.order_id,
                            buyer_id: userId,
                            device_label: navigator.platform,
                            user_agent: navigator.userAgent.substring(0, 200),
                          });
                        }}
                        className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold px-3 py-1.5 rounded-xl btn-liquid transition-colors">
                        <Download size={13}/> Baixar
                      </a>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && tab==='favourites' && (
        <div className="grid grid-cols-2 gap-3">
          {favs.length===0 && <p className="text-gray-600 text-sm text-center py-8 col-span-2">Sem favoritos ainda</p>}
          {favs.map(f=>{
            const p = f.products as Product;
            return (
              <div key={f.id} className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
                {firstProductImage(p?.imagem_url) ? <img src={firstProductImage(p?.imagem_url)!} alt="" className="w-full h-28 object-cover"/> : <div className="w-full h-28 bg-gray-700 flex items-center justify-center"><Package size={24} className="text-gray-500"/></div>}
                <div className="p-3">
                  <p className="text-white text-xs font-medium truncate">{p?.nome}</p>
                  <p className="text-emerald-400 text-sm font-bold mt-0.5">{format(p?.preco ?? 0)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && tab==='conversations' && (
        <div className="space-y-3">
          {orders.filter(o => o.conversation_id).length===0 && <p className="text-gray-600 text-sm text-center py-8">Sem conversas de compra ainda</p>}
          {orders.filter(o => o.conversation_id).map(o=>(
            <button key={o.id} onClick={() => o.conversation_id && openConversationChat(o.conversation_id)} className="w-full text-left bg-gray-800/50 border border-gray-700 rounded-2xl p-4 hover:border-gray-600 transition-colors">
              <p className="text-white text-sm font-medium">{(o.products as any)?.nome ?? 'Conversa de compra'}</p>
              <p className="text-gray-500 text-xs mt-1">{(o.stores as any)?.nome ?? 'Loja'} · {new Date(o.created_at).toLocaleDateString('pt-AO')}</p>
            </button>
          ))}
        </div>
      )}

      {!loading && tab==='reviews' && (
        <div className="space-y-3">
          {reviews.length===0 && <p className="text-gray-600 text-sm text-center py-8">Nenhuma avaliação feita ainda</p>}
          {reviews.map((review:any) => (
            <div key={review.id} className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
              <p className="text-white text-sm font-medium">{review.products?.nome ?? 'Produto'}</p>
              <p className="text-amber-400 text-xs mt-1">{'★'.repeat(review.rating)}{'☆'.repeat(Math.max(0, 5 - review.rating))}</p>
              {review.comment && <p className="text-gray-400 text-sm mt-2">{review.comment}</p>}
              <p className="text-gray-600 text-xs mt-2">{new Date(review.created_at).toLocaleDateString('pt-AO')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Marketplace ───────────────────────────────────────────────────────────
export default function Marketplace({ onNavigate, initialProductId }: { onNavigate?: (page: string) => void; initialProductId?: string }) {
  const { user }   = useAuth();
  const { format } = useCurrency();
  const { entryClass } = useAnimation();
  const { sendNotification } = useNotifications();

  const [products, setProducts]         = useState<Product[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [cat, setCat]                   = useState('todos');
  const [tipo, setTipo]                 = useState('todos');
  const [sort, setSort]                 = useState('destaque');
  const [viewMode, setViewMode]         = useState<'grid'|'list'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [contactProduct, setContactProduct]   = useState<Product | null>(null);
  const [showBuyerPanel, setShowBuyerPanel]   = useState(false);
  const [tab, setTab]                   = useState<'shop'|'orders'>('shop');

  const rankings = useMemo(() => {
    const topProduct = [...products].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0) || (b.review_count || 0) - (a.review_count || 0))[0] ?? null;
    const topStore = [...products].filter((item) => item.stores?.nome).sort((a, b) => ((b.stores?.verified ? 1 : 0) - (a.stores?.verified ? 1 : 0)) || (b.avg_rating || 0) - (a.avg_rating || 0))[0]?.stores ?? null;
    const trustedSeller = [...products].sort((a, b) => (b.total_vendas || 0) - (a.total_vendas || 0) || (b.avg_rating || 0) - (a.avg_rating || 0))[0]?.stores ?? null;
    return { topProduct, topStore, trustedSeller };
  }, [products]);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('products')
      .select('*, stores!store_id(nome,slug,verified,logo_url,owner_id,ativo,deleted_at)')
      .eq('ativo', true)
      .is('deleted_at', null)
      .eq('stores.ativo', true)
      .is('stores.deleted_at', null);

    if (cat !== 'todos') q = q.eq('categoria', cat);
    if (tipo !== 'todos') q = q.eq('tipo', tipo);
    if (search.trim()) q = q.ilike('nome', `%${search.trim()}%`);

    const sortMap: Record<string, {col: string; asc: boolean}> = {
      destaque: {col: 'destaque', asc: false},
      rating:   {col: 'avg_rating', asc: false},
      price_asc:{col: 'preco', asc: true},
      price_desc:{col: 'preco', asc: false},
      newest:   {col: 'created_at', asc: false},
      popular:  {col: 'total_vendas', asc: false},
    };
    const s = sortMap[sort] ?? sortMap.destaque;
    q = q.order(s.col, {ascending: s.asc}).order('total_vendas', {ascending:false}).limit(80);

    const { data } = await q;
    setProducts(((data as Product[] | null) ?? []).filter((item) => item.stores?.ativo !== false && !item.stores?.deleted_at));
    setLoading(false);
  }, [cat, tipo, search, sort]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setDocumentMeta({
      title: 'Marketplace IK Finance',
      description: 'Descubra produtos digitais e físicos, converse com fornecedores e acompanhe pedidos manualmente no ecossistema IK Finance.',
      keywords: ['marketplace', 'ik finance', 'produtos digitais', 'fornecedores', 'lojas'],
      url: buildStoreUrl('marketplace-overview', 'marketplace'),
    });
    setStructuredData('ik-marketplace-schema', {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Marketplace IK Finance',
      description: 'Produtos digitais e físicos do ecossistema IK Finance',
      url: buildStoreUrl('marketplace-overview', 'marketplace'),
    });
  }, []);

  useEffect(() => {
    if (!initialProductId) return;
    (async () => {
      const { data } = await supabase.from('products').select('*, stores!store_id(nome,slug,verified,logo_url,owner_id)').eq('id', initialProductId).maybeSingle();
      if (data) setSelectedProduct(data as Product);
    })();
  }, [initialProductId]);

  const productCard = (p: Product) => (
    <div key={p.id}
      className={`bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden cursor-pointer hover-lift group transition-all ${viewMode==='list'?'flex gap-4 p-4':'flex flex-col'}`}
      onClick={() => setSelectedProduct({ ...p, slug: p.slug ?? slugify(p.nome) })}>
      {/* Image */}
      <div className={`bg-gray-800 overflow-hidden shrink-0 relative ${viewMode==='list'?'w-20 h-20 rounded-xl':'aspect-video'}`}>
        {firstProductImage(p.imagem_url)
          ? <img src={firstProductImage(p.imagem_url)!} alt={p.nome} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
          : <div className="w-full h-full flex items-center justify-center"><Package size={28} className="text-gray-600"/></div>}
        {p.destaque && <span className="absolute top-2 left-2 bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-lg">★ Destaque</span>}
        {p.tipo === 'digital' && <span className="absolute top-2 right-2 bg-blue-500/80 text-white text-xs px-1.5 py-0.5 rounded-lg">Digital</span>}
      </div>
      {/* Info */}
      <div className={`flex flex-col ${viewMode==='list'?'flex-1 min-w-0 justify-between':'p-4'}`}>
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-white font-semibold text-sm leading-tight line-clamp-2">{p.nome}</p>
          </div>
          <div className="flex items-center gap-1 mb-2">
            <Star size={11} fill="#f59e0b" className="text-amber-400"/>
            <span className="text-gray-400 text-xs">{p.avg_rating > 0 ? p.avg_rating.toFixed(1) : 'Novo'}</span>
            <span className="text-gray-600 text-xs">({p.review_count})</span>
          </div>
          {viewMode === 'grid' && p.descricao && (
            <p className="text-gray-500 text-xs line-clamp-2 mb-3 leading-relaxed">{p.descricao}</p>
          )}
        </div>
        <div className="flex items-center justify-between mt-auto">
          <p className="text-white font-bold text-base">{format(p.preco)}</p>
          <div className="flex items-center gap-1.5">
            {p.stores?.verified && <CheckCircle size={12} className="text-emerald-400"/>}
            <span className="text-gray-600 text-xs truncate max-w-[80px]">{p.stores?.nome}</span>
          </div>
        </div>
        {viewMode === 'list' && (
          <button onClick={e=>{e.stopPropagation();setContactProduct(p);}}
            className="mt-2 flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-xl transition-colors w-fit">
            <MessageCircle size={12}/> Contactar
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={`space-y-5 ${entryClass()}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-white text-2xl font-bold">Marketplace</h1>
          <p className="text-gray-500 text-sm mt-0.5">Descubra produtos e serviços digitais</p>
        </div>
        {user && (
          <div className="flex gap-2">
            <button onClick={()=>{setTab('shop');setShowBuyerPanel(false);}}
              className={`text-sm px-4 py-2 rounded-xl font-medium transition-colors ${tab==='shop'?'bg-emerald-500 text-white':'bg-gray-800 text-gray-400 hover:text-white'}`}>
              Loja
            </button>
            <button onClick={()=>{setTab('orders');setShowBuyerPanel(true);}}
              className={`text-sm px-4 py-2 rounded-xl font-medium transition-colors ${tab==='orders'?'bg-emerald-500 text-white':'bg-gray-800 text-gray-400 hover:text-white'}`}>
              Meus Pedidos
            </button>
          </div>
        )}
      </div>

      {/* Buyer panel */}
      {showBuyerPanel && user && (
        <BuyerPanel userId={user.id} onNavigateChat={()=>onNavigate?.('chat')}/>
      )}

      {!showBuyerPanel && (
        <>
          <div className="grid md:grid-cols-3 gap-3">
            <button onClick={() => rankings.topProduct && setSelectedProduct(rankings.topProduct)} className="text-left rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 hover:border-amber-400/40 transition-colors">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-300/80 mb-2">Produto mais bem avaliado</p>
              <p className="text-white font-semibold text-sm">{rankings.topProduct?.nome ?? 'Sem dados'}</p>
              <p className="text-amber-200/80 text-xs mt-1">{rankings.topProduct ? `${formatReviewScore(rankings.topProduct.avg_rating)} estrelas` : 'Aguardando avaliações'}</p>
            </button>
            <button onClick={() => rankings.topStore && window.dispatchEvent(new CustomEvent('openStoreProfile', { detail: { id: products.find((item) => item.stores?.slug === rankings.topStore?.slug)?.store_id } }))} className="text-left rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 hover:border-blue-400/40 transition-colors">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-200/80 mb-2">Loja mais bem avaliada</p>
              <p className="text-white font-semibold text-sm">{rankings.topStore?.nome ?? 'Sem dados'}</p>
              <p className="text-blue-100/80 text-xs mt-1">{rankings.topStore?.verified ? 'Loja verificada' : 'Com melhor reputação atual'}</p>
            </button>
            <button onClick={() => rankings.trustedSeller && window.dispatchEvent(new CustomEvent('openStoreProfile', { detail: { id: products.find((item) => item.stores?.slug === rankings.trustedSeller?.slug)?.store_id } }))} className="text-left rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 hover:border-emerald-400/40 transition-colors">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80 mb-2">Vendedor mais confiável</p>
              <p className="text-white font-semibold text-sm">{rankings.trustedSeller?.nome ?? 'Sem dados'}</p>
              <p className="text-emerald-100/80 text-xs mt-1">Baseado em vendas, avaliação e verificação</p>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar produtos..."
                  className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-emerald-500 placeholder-gray-600"/>
              </div>
              <select value={sort} onChange={e=>setSort(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-xl px-3 py-2.5 focus:outline-none">
                <option value="destaque">Destaques</option>
                <option value="rating">Melhor avaliação</option>
                <option value="price_asc">Preço ↑</option>
                <option value="price_desc">Preço ↓</option>
                <option value="newest">Mais recentes</option>
                <option value="popular">Mais populares</option>
              </select>
              <div className="flex gap-1 bg-gray-900 border border-gray-700 rounded-xl p-1">
                <button onClick={()=>setViewMode('grid')} className={`p-1.5 rounded-lg transition-colors ${viewMode==='grid'?'bg-emerald-500 text-white':'text-gray-500 hover:text-white'}`}><Grid3X3 size={14}/></button>
                <button onClick={()=>setViewMode('list')} className={`p-1.5 rounded-lg transition-colors ${viewMode==='list'?'bg-emerald-500 text-white':'text-gray-500 hover:text-white'}`}><List size={14}/></button>
              </div>
            </div>

            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {CATS.map(c=>(
                <button key={c} onClick={()=>setCat(c)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${c===cat?'bg-emerald-500 text-white':'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'}`}>
                  {CAT_LABELS[c]}
                </button>
              ))}
            </div>

            {/* Type filter */}
            <div className="flex gap-2">
              {['todos','digital','physical'].map(t=>(
                <button key={t} onClick={()=>setTipo(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${t===tipo?'bg-blue-500/20 text-blue-400 border border-blue-700':'bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300'}`}>
                  {t==='todos'?'Todos':t==='digital'?'📱 Digital':'📦 Físico'}
                </button>
              ))}
            </div>
          </div>

          {/* Products */}
          {loading ? (
            <div className={`grid ${viewMode==='grid'?'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4':'grid-cols-1'} gap-4`}>
              {Array.from({length:8}).map((_,i)=>(
                <div key={i} className={`anim-skeleton rounded-2xl ${viewMode==='grid'?'h-64':'h-24'}`}/>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4"><ShoppingBag size={28} className="text-gray-600"/></div>
              <p className="text-gray-400 font-medium">Nenhum produto encontrado</p>
              <p className="text-gray-600 text-sm mt-1">Tente outros filtros ou categorias</p>
            </div>
          ) : (
            <div className={`grid gap-4 ${viewMode==='grid'?'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4':'grid-cols-1'}`}>
              {products.map(productCard)}
            </div>
          )}
        </>
      )}

      {/* Product detail modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          userId={user?.id}
          onClose={()=>setSelectedProduct(null)}
          onContactSupplier={p=>{setSelectedProduct(null);setContactProduct(p);}}
        />
      )}

      {/* Contact supplier modal */}
      {contactProduct && user && (
        <ContactSupplierModal
          product={contactProduct}
          userId={user.id}
          onClose={()=>setContactProduct(null)}
          onNavigateChat={()=>{ setContactProduct(null); onNavigate?.('chat'); }}
        />
      )}
    </div>
  );
}
