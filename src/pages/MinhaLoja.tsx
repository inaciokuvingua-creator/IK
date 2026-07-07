import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Edit3, Trash2, Package, Store, Upload, X, Check,
  BarChart2, ShoppingBag, Download, MessageCircle, Eye,
  RefreshCw, Star, AlertTriangle, CheckCircle, XCircle,
  Paperclip, ChevronDown, ChevronUp, RotateCcw, Clock,
  DollarSign, Users, FileText, Image as ImageIcon, Music,
  Film, Archive,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useAnimation } from '../context/AnimationContext';
import { useNotifications } from '../context/NotificationContext';
import ImageUpload from '../components/ImageUpload';
import FileUpload from '../components/FileUpload';
import MultiImageUpload from '../components/MultiImageUpload';
import { firstProductImage, parseProductImages } from '../lib/format';
import { slugify } from '../lib/marketplace';
import { checkMarketplaceRateLimit, queueMarketplaceModeration } from '../lib/marketplaceGuardrails';
import { buildPaymentInstructions, type PaymentProfile } from '../lib/paymentProfiles';
import PaymentMethodsManager from '../components/PaymentMethodsManager';

// ── Types ─────────────────────────────────────────────────────────────────────
type Store = {
  id: string; owner_id: string; slug: string; nome: string;
  descricao: string | null; logo_url: string | null; banner_url: string | null;
  categoria: string; verified: boolean; ativo: boolean;
  rating: number; total_sales: number; avg_rating: number; review_count: number;
  localizacao: string | null; whatsapp: string | null; email_contato: string | null;
  deleted_at: string | null;
};

type Product = {
  id: string; store_id: string; owner_id: string; nome: string;
  descricao: string | null; preco: number; moeda: string;
  tipo: 'digital' | 'physical'; categoria: string; subcategoria: string | null;
  marca: string | null; imagem_url: string | null; arquivo_url: string | null;
  estoque: number | null; ativo: boolean; destaque: boolean;
  total_vendas: number; total_views: number; avg_rating: number; review_count: number;
  disponibilidade: string; localizacao: string | null;
  peso: number | null; transportadora: string | null; tempo_entrega: string | null;
  formatos: string[] | null; tags: string[] | null;
  deleted_at: string | null; created_at: string;
};

type ProductMedia = {
  id: string;
  product_id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  name: string | null;
  mime: string | null;
};

type Order = {
  id: string; buyer_id: string; store_id: string; product_id: string;
  quantidade: number; preco_unitario: number; total: number; moeda: string;
  status: string; notes: string | null; proof_url: string | null;
  approved_at: string | null; download_released: boolean;
  conversation_id: string | null; created_at: string;
  products?: { nome: string; imagem_url: string | null; tipo: string; arquivo_url: string | null };
  profiles?: { nome: string; avatar_url: string | null };
  order_proofs?: { id: string; url: string; name: string | null; created_at: string }[];
};

type DownloadToken = {
  id: string; order_id: string; product_id: string; buyer_id: string;
  token: string; expires_at: string | null; max_downloads: number;
  download_count: number; revoked: boolean; created_at: string;
  products?: { nome: string };
  profiles?: { nome: string };
};

type StorePaymentProfile = PaymentProfile;

const CATS = ['software','musica','ebooks','cursos','templates','fotos','videos','dados','fisico','outro'];
const CAT_LABELS: Record<string, string> = {
  software: 'Software', musica: 'Música', ebooks: 'E-Books',
  cursos: 'Cursos', templates: 'Templates', fotos: 'Fotos/Arte',
  videos: 'Vídeos', dados: 'Dados', fisico: 'Físico', outro: 'Outro',
};
const FORMATS = ['PDF','DOCX','XLSX','PPTX','MP3','WAV','MP4','ZIP','APK','EXE','PSD','AI','SVG','PNG','JPG'];

function fmt(n: number) {
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n/1000).toFixed(1)}K`;
  return String(n);
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────
function ConfirmDelete({ label, onConfirm, onCancel, type = 'item' }: {
  label: string; onConfirm: ()=>void; onCancel: ()=>void; type?: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 anim-modal" onClick={e=>e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} className="text-red-400"/>
        </div>
        <h3 className="text-white font-bold text-center mb-2">Eliminar {type}?</h3>
        <p className="text-gray-400 text-sm text-center mb-6">
          <span className="text-white font-medium">"{label}"</span> será movido para a lixeira.
          Pode restaurar nos próximos 30 dias.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800 text-sm transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ── Release Download Modal ────────────────────────────────────────────────────
function ReleaseDownloadModal({ order, onRelease, onClose }: {
  order: Order; onRelease: (orderId: string, expiryDays: number, maxDownloads: number)=>void; onClose: ()=>void;
}) {
  const [expiryDays, setExpiryDays] = useState(30);
  const [maxDl, setMaxDl]           = useState(3);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 anim-modal" onClick={e=>e.stopPropagation()}>
        <h3 className="text-white font-bold mb-5">Liberar Download</h3>
        <p className="text-gray-400 text-sm mb-5">Produto: <span className="text-white">{(order.products as any)?.nome}</span></p>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Validade (dias)</label>
            <select value={expiryDays} onChange={e=>setExpiryDays(+e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none">
              {[7,14,30,60,90,365,0].map(d=><option key={d} value={d}>{d===0?'Sem expiração':`${d} dias`}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Máximo de downloads</label>
            <select value={maxDl} onChange={e=>setMaxDl(+e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none">
              {[1,2,3,5,10,20,0].map(d=><option key={d} value={d}>{d===0?'Ilimitado':`${d} downloads`}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800 text-sm transition-colors">Cancelar</button>
          <button onClick={()=>onRelease(order.id, expiryDays, maxDl)} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white py-2.5 rounded-xl text-sm font-semibold btn-liquid btn-ripple transition-colors">
            <Download size={14} className="inline mr-1.5"/> Liberar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main MinhaLoja ─────────────────────────────────────────────────────────────
export default function MinhaLoja({ onNavigate }: { onNavigate?: (p: string)=>void }) {
  const { user }   = useAuth();
  const { format } = useCurrency();
  const { entryClass } = useAnimation();
  const { sendNotification } = useNotifications();

  const [store, setStore]           = useState<Store | null>(null);
  const [deletedStore, setDeletedStore] = useState<Store | null>(null);
  const [products, setProducts]     = useState<Product[]>([]);
  const [trash, setTrash]           = useState<Product[]>([]);
  const [orders, setOrders]         = useState<Order[]>([]);
  const [tokens, setTokens]         = useState<DownloadToken[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<'overview'|'products'|'orders'|'downloads'|'trash'>('overview');

  // Forms
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget]     = useState<{id:string;nome:string;type:'product'|'store'} | null>(null);
  const [releaseOrder, setReleaseOrder]     = useState<Order | null>(null);
  const [expandedOrder, setExpandedOrder]   = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedTrashIds, setSelectedTrashIds] = useState<string[]>([]);
  const [storePaymentMethods, setStorePaymentMethods] = useState<StorePaymentProfile[]>([]);

  // Store form
  const [sNome, setSNome]     = useState('');
  const [sDesc, setSDesc]     = useState('');
  const [sSlug, setSSlug]     = useState('');
  const [sCat, setSCat]       = useState('geral');
  const [sLogo, setSLogo]     = useState('');
  const [sBanner, setSBanner] = useState('');
  const [sLocal, setSLocal]   = useState('');
  const [sWA, setSWA]         = useState('');
  const [sEmail, setSEmail]   = useState('');
  const [savingStore, setSavingStore] = useState(false);

  // Product form
  const [pNome, setPNome]     = useState('');
  const [pDesc, setPDesc]     = useState('');
  const [pPreco, setPPreco]   = useState('');
  const [pTipo, setPTipo]     = useState<'digital'|'physical'>('digital');
  const [pCat, setPCat]       = useState('software');
  const [pSub, setPSub]       = useState('');
  const [pMarca, setPMarca]   = useState('');
  const [pImg, setPImg]       = useState('');
  const [pImgs, setPImgs]     = useState<string[]>([]);
  const [pArq, setPArq]       = useState('');
  const [pEstoque, setPEstoque] = useState('');
  const [pDisp, setPDisp]     = useState('disponivel');
  const [pLocal, setPLocal]   = useState('');
  const [pPeso, setPPeso]     = useState('');
  const [pTrans, setPTrans]   = useState('');
  const [pEntrega, setPEntrega] = useState('');
  const [pFormatos, setPFormatos] = useState<string[]>([]);
  const [pTags, setPTags]     = useState('');
  const [pDestaque, setPDestaque] = useState(false);
  const [pVideo, setPVideo]       = useState('');
  const [pVideoName, setPVideoName] = useState<string | null>(null);
  const [pAudio, setPAudio]       = useState('');
  const [pAudioName, setPAudioName] = useState<string | null>(null);
  const [pDoc, setPDoc]           = useState('');
  const [pDocName, setPDocName]   = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: storeData } = await supabase.from('stores').select('*').eq('owner_id', user.id).is('deleted_at', null).maybeSingle();
    setStore(storeData as Store ?? null);
    if (!storeData) {
      const { data: removedStore } = await supabase.from('stores').select('*').eq('owner_id', user.id).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).limit(1).maybeSingle();
      setDeletedStore(removedStore as Store ?? null);
    } else {
      setDeletedStore(null);
    }

    if (storeData) {
      const [prods, trashProds, ordsData, toks, payments] = await Promise.all([
        supabase.from('products').select('*').eq('store_id', storeData.id).is('deleted_at', null).order('created_at',{ascending:false}),
        supabase.from('products').select('*').eq('store_id', storeData.id).not('deleted_at','is',null).order('deleted_at',{ascending:false}),
        supabase.from('orders').select('*, products:product_id(nome,imagem_url,tipo,arquivo_url), profiles:buyer_id(nome,avatar_url), order_proofs(id,url,name,created_at)').eq('store_id', storeData.id).order('created_at',{ascending:false}),
        supabase.from('download_tokens').select('*, products:product_id(nome), profiles:buyer_id(nome)').in('product_id', (await supabase.from('products').select('id').eq('store_id',storeData.id)).data?.map(p=>p.id) ?? []).order('created_at',{ascending:false}),
        supabase.from('payment_profiles').select('*').eq('owner_type', 'store').eq('store_id', storeData.id).eq('is_active', true).order('is_default', { ascending: false }),
      ]);
      setProducts(prods.data as Product[] ?? []);
      setTrash(trashProds.data as Product[] ?? []);
      setOrders(ordsData.data as Order[] ?? []);
      setTokens(toks.data as DownloadToken[] ?? []);
      setStorePaymentMethods(payments.data as StorePaymentProfile[] ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Realtime orders
  useEffect(() => {
    if (!store) return;
    const ch = supabase.channel('seller:' + store.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'orders',filter:`store_id=eq.${store.id}`}, loadAll)
      .on('postgres_changes',{event:'*',schema:'public',table:'order_proofs'}, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [store?.id, loadAll]);

  // ── Store CRUD ───────────────────────────────────────────────────────────────
  const openStoreForm = () => {
    if (store) {
      setSNome(store.nome); setSDesc(store.descricao??''); setSSlug(store.slug);
      setSCat(store.categoria); setSLogo(store.logo_url??''); setSBanner(store.banner_url??'');
      setSLocal(store.localizacao??''); setSWA(store.whatsapp??''); setSEmail(store.email_contato??'');
    } else {
      setSNome(''); setSDesc(''); setSSlug(''); setSCat('geral'); setSLogo(''); setSBanner('');
      setSLocal(''); setSWA(''); setSEmail('');
    }
    setShowStoreForm(true);
  };

  const saveStore = async () => {
    if (!user || !sNome.trim() || !sSlug.trim()) return;
    setSavingStore(true);
    const slug = sSlug.toLowerCase().replace(/[^a-z0-9-]/g,'-');
    const payload = { nome: sNome, descricao: sDesc||null, slug, categoria: sCat, logo_url: sLogo||null, banner_url: sBanner||null, localizacao: sLocal||null, whatsapp: sWA||null, email_contato: sEmail||null };
    if (store) {
      await supabase.from('stores').update(payload).eq('id', store.id);
    } else {
      await supabase.from('stores').insert({ ...payload, owner_id: user.id });
    }
    await loadAll();
    setShowStoreForm(false);
    setSavingStore(false);
  };

  const deleteStore = async () => {
    if (!store) return;
    await supabase.from('stores').update({ deleted_at: new Date().toISOString(), restore_until: new Date(Date.now() + 30 * 86400000).toISOString(), ativo: false }).eq('id', store.id);
    setStore(null); setDeleteTarget(null);
    await loadAll();
  };

  const restoreStore = async () => {
    if (!deletedStore) return;
    await supabase.from('stores').update({ deleted_at: null, restore_until: null, ativo: true }).eq('id', deletedStore.id);
    await loadAll();
  };

  const permanentDeleteStore = async () => {
    if (!deletedStore) return;
    await supabase.from('stores').delete().eq('id', deletedStore.id);
    setDeletedStore(null);
    await loadAll();
  };

  // ── Product CRUD ─────────────────────────────────────────────────────────────
  const openProductForm = (p?: Product) => {
    if (p) {
      setEditingProduct(p);
      setPNome(p.nome); setPDesc(p.descricao??''); setPPreco(String(p.preco));
      setPTipo(p.tipo); setPCat(p.categoria); setPSub(p.subcategoria??'');
      setPMarca(p.marca??'');
      // imagem_url may be a single URL or a JSON array string
      try {
        const imgs = p.imagem_url ? (Array.isArray(p.imagem_url) ? p.imagem_url : (typeof p.imagem_url === 'string' && p.imagem_url.trim().startsWith('[') ? JSON.parse(p.imagem_url) : [p.imagem_url])) : [];
        setPImgs(Array.isArray(imgs) ? imgs.map(String) : []);
        setPImg((Array.isArray(imgs) ? imgs[0] : (imgs as any)) ?? '');
      } catch {
        setPImgs([]); setPImg(p.imagem_url??'');
      }
      setPArq(p.arquivo_url??'');
      setPEstoque(p.estoque!=null?String(p.estoque):''); setPDisp(p.disponibilidade);
      setPLocal(p.localizacao??''); setPPeso(p.peso!=null?String(p.peso):'');
      setPTrans(p.transportadora??''); setPEntrega(p.tempo_entrega??'');
      setPFormatos(p.formatos??[]); setPTags((p.tags??[]).join(', '));
      setPDestaque(p.destaque);
      setPVideo(''); setPVideoName(null); setPAudio(''); setPAudioName(null); setPDoc(''); setPDocName(null);
      supabase.from('product_media').select('*').eq('product_id', p.id).then(({ data }) => {
        const media = (data ?? []) as ProductMedia[];
        const video = media.find((item) => item.type === 'video');
        const audio = media.find((item) => item.type === 'audio');
        const document = media.find((item) => item.type === 'document');
        setPVideo(video?.url ?? ''); setPVideoName(video?.name ?? null);
        setPAudio(audio?.url ?? ''); setPAudioName(audio?.name ?? null);
        setPDoc(document?.url ?? ''); setPDocName(document?.name ?? null);
      });
    } else {
      setEditingProduct(null);
      setPNome(''); setPDesc(''); setPPreco(''); setPTipo('digital'); setPCat('software');
      setPSub(''); setPMarca(''); setPImg(''); setPArq(''); setPEstoque('');
      setPDisp('disponivel'); setPLocal(''); setPPeso(''); setPTrans(''); setPEntrega('');
      setPFormatos([]); setPTags(''); setPDestaque(false);
      setPVideo(''); setPVideoName(null); setPAudio(''); setPAudioName(null); setPDoc(''); setPDocName(null);
    }
    setShowProductForm(true);
  };

  const saveProduct = async () => {
    if (!user || !store || !pNome.trim() || !pPreco) return;
    const rateLimit = await checkMarketplaceRateLimit({ action: editingProduct ? 'product_update' : 'product_create', limit: 15, windowMs: 60 * 60 * 1000, userId: user.id, metadata: { storeId: store.id } });
    if (!rateLimit.allowed) {
      alert('Muitas alterações de produtos em pouco tempo. Aguarde antes de continuar.');
      return;
    }
    setSavingProduct(true);
    const payload = {
      store_id: store.id,
      nome: pNome.trim(), descricao: pDesc||null,
      preco: parseFloat(pPreco), tipo: pTipo,
      categoria: pCat, subcategoria: pSub||null,
      marca: pMarca||null, imagem_url: pImgs.length ? JSON.stringify(pImgs) : (pImg||null), arquivo_url: pArq||null,
      estoque: pEstoque ? parseInt(pEstoque) : null,
      disponibilidade: pDisp, localizacao: pLocal||null,
      peso: pPeso ? parseFloat(pPeso) : null,
      transportadora: pTrans||null, tempo_entrega: pEntrega||null,
      formatos: pFormatos.length ? pFormatos : null,
      tags: pTags.split(',').map(t=>t.trim()).filter(Boolean) || null,
      destaque: pDestaque,
    };
    let productId = editingProduct?.id ?? null;
    if (editingProduct) {
      await supabase.from('products').update(payload).eq('id', editingProduct.id);
      productId = editingProduct.id;
    } else {
      const { data: created } = await supabase.from('products').insert({ ...payload, owner_id: user.id, slug: slugify(pNome) }).select('id').single();
      productId = created?.id ?? null;
    }
    if (productId) {
      await supabase.from('product_media').delete().eq('product_id', productId).in('type', ['video', 'audio', 'document']);
      const mediaRows = [
        pVideo ? { product_id: productId, owner_id: user.id, type: 'video', url: pVideo, name: pVideoName } : null,
        pAudio ? { product_id: productId, owner_id: user.id, type: 'audio', url: pAudio, name: pAudioName } : null,
        pDoc ? { product_id: productId, owner_id: user.id, type: 'document', url: pDoc, name: pDocName } : null,
      ].filter(Boolean);
      if (mediaRows.length > 0) await supabase.from('product_media').insert(mediaRows as any[]);
      await queueMarketplaceModeration({
        entityType: 'product',
        entityId: productId,
        ownerId: user.id,
        summary: `${editingProduct ? 'Atualização' : 'Novo produto'}: ${pNome}`,
        priority: pDestaque ? 'high' : 'normal',
        metadata: { tipo: pTipo, categoria: pCat, formatos: pFormatos },
      });
    }
    // Audit
    await supabase.from('marketplace_audit').insert({
      entity_type: 'product', action: editingProduct ? 'update' : 'create',
      details: { nome: pNome }
    });
    await loadAll();
    setShowProductForm(false);
    setSavingProduct(false);
  };

  const softDeleteProduct = async (id: string) => {
    await supabase.from('products').update({ deleted_at: new Date().toISOString(), restore_until: new Date(Date.now() + 30 * 86400000).toISOString(), ativo: false }).eq('id', id);
    await supabase.from('marketplace_audit').insert({ entity_type:'product', action:'soft_delete', entity_id: id, details: {} });
    setDeleteTarget(null);
    await loadAll();
  };

  const restoreProduct = async (id: string) => {
    await supabase.from('products').update({ deleted_at: null, ativo: true }).eq('id', id);
    await loadAll();
  };

  const permanentDelete = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    await loadAll();
  };

  const bulkDeleteProducts = async () => {
    if (selectedProductIds.length === 0) return;
    await supabase.from('products').update({ deleted_at: new Date().toISOString(), restore_until: new Date(Date.now() + 30 * 86400000).toISOString(), ativo: false }).in('id', selectedProductIds);
    setSelectedProductIds([]);
    await loadAll();
  };

  const bulkRestoreProducts = async () => {
    if (selectedTrashIds.length === 0) return;
    await supabase.from('products').update({ deleted_at: null, restore_until: null, ativo: true }).in('id', selectedTrashIds);
    setSelectedTrashIds([]);
    await loadAll();
  };

  const bulkPermanentDeleteProducts = async () => {
    if (selectedTrashIds.length === 0) return;
    await supabase.from('products').delete().in('id', selectedTrashIds);
    setSelectedTrashIds([]);
    await loadAll();
  };

  // ── Order management ──────────────────────────────────────────────────────────
  const updateOrderStatus = async (orderId: string, status: string) => {
    const patch: any = { status };
    if (status === 'delivered') patch.approved_at = new Date().toISOString();
    await supabase.from('orders').update(patch).eq('id', orderId);
    setOrders(prev => prev.map(o => o.id===orderId ? {...o,...patch} : o));
    const order = orders.find((item) => item.id === orderId);
    if (order?.buyer_id) {
      const title = status === 'delivered' ? 'Pagamento aprovado' : status === 'cancelled' ? 'Pagamento rejeitado' : 'Novo comprovativo solicitado';
      const body = status === 'delivered'
        ? `O fornecedor aprovou o pagamento de ${(order.products as any)?.nome ?? 'seu pedido'}.`
        : status === 'cancelled'
        ? `O fornecedor rejeitou o comprovativo de ${(order.products as any)?.nome ?? 'seu pedido'}.`
        : `O fornecedor pediu um novo comprovativo para ${(order.products as any)?.nome ?? 'seu pedido'}.`;
      await sendNotification(title, body, 'marketplace_payment', { userId: order.buyer_id, url: order.product_id ? `/?page=marketplace&view=product&product=${order.product_id}` : '/' });
    }
    // Audit
    await supabase.from('marketplace_audit').insert({ entity_type:'order', action:`status_${status}`, entity_id: orderId, details:{} });
  };

  const releaseDownload = async (orderId: string, expiryDays: number, maxDownloads: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || !user) return;
    const expiresAt = expiryDays > 0 ? new Date(Date.now() + expiryDays*86400000).toISOString() : null;
    await supabase.from('download_tokens').insert({
      order_id: orderId,
      product_id: order.product_id,
      buyer_id: order.buyer_id,
      expires_at: expiresAt,
      max_downloads: maxDownloads || 999999,
      released_by: user.id,
    });
    await supabase.from('orders').update({ download_released: true, status: 'delivered' }).eq('id', orderId);
    await sendNotification(
      'Download liberado',
      `O download de ${(order.products as any)?.nome ?? 'seu produto'} foi liberado pelo fornecedor.`,
      'marketplace_download',
      { userId: order.buyer_id, url: order.product_id ? `/?page=marketplace&view=product&product=${order.product_id}` : '/' }
    );
    // Audit
    await supabase.from('marketplace_audit').insert({ entity_type:'download', action:'released', entity_id: orderId, details: {expiryDays, maxDownloads} });
    setReleaseOrder(null);
    await loadAll();
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const stats = {
    totalRevenue: orders.filter(o=>o.status==='delivered'||o.status==='paid').reduce((s,o)=>s+o.total,0),
    pendingOrders: orders.filter(o=>o.status==='pending').length,
    paidOrders: orders.filter(o=>o.status==='paid').length,
    deliveredOrders: orders.filter(o=>o.status==='delivered').length,
    totalProducts: products.length,
    totalViews: products.reduce((s,p)=>s+(p.total_views||0),0),
    activeDownloads: tokens.filter(t=>!t.revoked).length,
  };

  const statusBadge = (s: string) => {
    const cfg: Record<string,[string,string]> = {
      pending:   ['bg-amber-500/20 text-amber-400','Pendente'],
      paid:      ['bg-blue-500/20 text-blue-400','Pago'],
      delivered: ['bg-emerald-500/20 text-emerald-400','Entregue'],
      cancelled: ['bg-red-500/20 text-red-400','Cancelado'],
    };
    const [cls, lbl] = cfg[s] ?? ['bg-gray-700 text-gray-400', s];
    return <span className={`${cls} text-xs font-medium px-2.5 py-1 rounded-full`}>{lbl}</span>;
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  // ── No store yet ───────────────────────────────────────────────────────────
  if (!store && deletedStore && !showStoreForm) return (
    <div className={`space-y-6 ${entryClass()}`}>
      <h1 className="text-white text-2xl font-bold">Minha Loja</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto"><Clock size={28} className="text-amber-400" /></div>
        <p className="text-white font-bold text-xl">Loja na lixeira</p>
        <p className="text-gray-400 text-sm">{deletedStore.nome} foi removida, mas ainda pode ser restaurada antes da exclusão definitiva.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={restoreStore} className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-5 py-3 rounded-xl"><RotateCcw size={16} /> Restaurar loja</button>
          <button onClick={permanentDeleteStore} className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold px-5 py-3 rounded-xl"><Trash2 size={16} /> Apagar definitivamente</button>
        </div>
      </div>
    </div>
  );

  if (!store && !showStoreForm) return (
    <div className={`space-y-6 ${entryClass()}`}>
      <h1 className="text-white text-2xl font-bold">Minha Loja</h1>
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-5">
          <Store size={28} className="text-gray-600"/>
        </div>
        <p className="text-white font-bold text-xl mb-2">Crie a sua loja</p>
        <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">Venda produtos digitais e físicos para todo o ecossistema IK Finance. 95% das vendas vai diretamente para si.</p>
        <button onClick={openStoreForm} className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3 rounded-xl btn-liquid btn-ripple transition-colors">
          <Plus size={18}/> Criar Loja
        </button>
      </div>
    </div>
  );

  return (
    <div className={`space-y-5 ${entryClass()}`}>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-white text-2xl font-bold">Minha Loja</h1>
          {store && <p className="text-gray-500 text-sm mt-0.5">{store.nome} · {store.slug}</p>}
        </div>
        {store && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={openStoreForm} className="flex items-center gap-1.5 text-sm bg-gray-800 border border-gray-700 text-gray-300 hover:text-white px-3.5 py-2 rounded-xl transition-colors">
              <Edit3 size={14}/> Editar Loja
            </button>
            <button onClick={() => openProductForm()} className="flex items-center gap-1.5 text-sm bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-3.5 py-2 rounded-xl btn-liquid btn-ripple transition-colors">
              <Plus size={14}/> Novo Produto
            </button>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      {store && (
        <div className="flex gap-1 overflow-x-auto bg-gray-900 border border-gray-800 rounded-2xl p-1">
          {(['overview','products','orders','downloads','trash'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`shrink-0 px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${tab===t?'bg-emerald-500 text-white':'text-gray-400 hover:text-gray-200'}`}>
              {t==='overview'?'Visão Geral':t==='products'?`Produtos (${products.length})`:t==='orders'?`Pedidos (${orders.length})`:t==='downloads'?'Downloads':`Lixeira (${trash.length})`}
            </button>
          ))}
        </div>
      )}

      {/* ── Overview ── */}
      {tab === 'overview' && store && (
        <div className="space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: DollarSign, label: 'Receita Total',    value: format(stats.totalRevenue),      color: 'emerald' },
              { icon: ShoppingBag,label: 'Pedidos Pendentes',value: String(stats.pendingOrders),     color: 'amber'   },
              { icon: Package,    label: 'Produtos',         value: String(stats.totalProducts),     color: 'blue'    },
              { icon: Eye,        label: 'Visualizações',    value: fmt(stats.totalViews),            color: 'purple'  },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="kpi-card">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${color==='emerald'?'bg-emerald-950 text-emerald-400':color==='amber'?'bg-amber-950 text-amber-400':color==='blue'?'bg-blue-950 text-blue-400':'bg-purple-950 text-purple-400'}`}>
                  <Icon size={16}/>
                </div>
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-gray-500 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Recent orders preview */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Pedidos Recentes</h3>
              <button onClick={()=>setTab('orders')} className="text-emerald-400 text-xs hover:text-emerald-300 transition-colors">Ver todos</button>
            </div>
            {orders.slice(0,4).length === 0
              ? <p className="text-gray-600 text-sm text-center py-4">Sem pedidos ainda</p>
              : orders.slice(0,4).map(o => (
                <div key={o.id} className="flex items-center gap-3 py-2.5 border-b border-gray-800 last:border-0">
                  <div className="w-8 h-8 rounded-xl bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                    {(o.profiles as any)?.nome?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{(o.products as any)?.nome}</p>
                    <p className="text-gray-500 text-xs">{(o.profiles as any)?.nome ?? 'Comprador'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-xs font-bold">{format(o.total)}</p>
                    {statusBadge(o.status)}
                  </div>
                </div>
              ))
            }
          </div>

          {/* Top products */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Produtos</h3>
              <button onClick={()=>setTab('products')} className="text-emerald-400 text-xs hover:text-emerald-300 transition-colors">Gerir</button>
            </div>
            {products.slice(0,5).map(p => (
              <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-gray-800 last:border-0">
                {firstProductImage(p.imagem_url)
                  ? <img src={firstProductImage(p.imagem_url)!} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0"/>
                  : <div className="w-9 h-9 rounded-lg bg-gray-700 flex items-center justify-center shrink-0"><Package size={15} className="text-gray-500"/></div>}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{p.nome}</p>
                  <p className="text-gray-500 text-xs">{fmt(p.total_views||0)} vis · {p.total_vendas} vendas</p>
                </div>
                <p className="text-white text-xs font-bold shrink-0">{format(p.preco)}</p>
              </div>
            ))}
          </div>

          <PaymentMethodsManager ownerType="store" storeId={store.id} title="Recebimentos externos da loja" subtitle="Configure contas bancárias, carteiras e métodos P2P externos para que compradores paguem como na Redotpay, mas dentro do seu fluxo atual de chat, prova e liberação." />
        </div>
      )}

      {/* ── Products tab ── */}
      {tab === 'products' && (
        <div className="space-y-3">
          {products.length > 0 && (
            <div className="flex items-center justify-between gap-3 flex-wrap bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
              <p className="text-gray-400 text-xs">{selectedProductIds.length} selecionado(s)</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSelectedProductIds(products.map((p) => p.id))} className="text-xs px-3 py-1.5 rounded-xl bg-gray-800 text-gray-300">Selecionar todos</button>
                <button onClick={() => setSelectedProductIds([])} className="text-xs px-3 py-1.5 rounded-xl bg-gray-800 text-gray-300">Limpar</button>
                <button onClick={bulkDeleteProducts} disabled={selectedProductIds.length === 0} className="text-xs px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white">Eliminar em massa</button>
              </div>
            </div>
          )}
          {products.length === 0 && (
            <div className="text-center py-12">
              <Package size={32} className="text-gray-600 mx-auto mb-3"/>
              <p className="text-gray-500 text-sm">Sem produtos. Adicione o primeiro!</p>
            </div>
          )}
          {products.map(p => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4 hover-lift">
              <input type="checkbox" checked={selectedProductIds.includes(p.id)} onChange={(e) => setSelectedProductIds((prev) => e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id))} className="shrink-0" />
              {firstProductImage(p.imagem_url)
                ? <img src={firstProductImage(p.imagem_url)!} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0"/>
                : <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center shrink-0"><Package size={22} className="text-gray-600"/></div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-semibold text-sm truncate">{p.nome}</p>
                  {p.destaque && <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">Destaque</span>}
                  {!p.ativo && <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">Inativo</span>}
                </div>
                <p className="text-gray-500 text-xs mt-0.5">{CAT_LABELS[p.categoria] ?? p.categoria} · {p.tipo === 'digital' ? 'Digital' : 'Físico'}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-emerald-400 text-sm font-bold">{format(p.preco)}</span>
                  <span className="text-gray-600 text-xs">{fmt(p.total_views||0)} vis</span>
                  <span className="text-gray-600 text-xs">{p.total_vendas} vendas</span>
                  {p.avg_rating > 0 && <span className="text-amber-400 text-xs">★{p.avg_rating.toFixed(1)}</span>}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={()=>openProductForm(p)} className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"><Edit3 size={13}/></button>
                <button onClick={()=>setDeleteTarget({id:p.id,nome:p.nome,type:'product'})} className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-red-900/40 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"><Trash2 size={13}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Orders tab ── */}
      {tab === 'orders' && (
        <div className="space-y-3">
          {orders.length === 0 && <p className="text-gray-600 text-sm text-center py-12">Sem pedidos ainda</p>}
          {orders.map(o => (
            <div key={o.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="p-4 flex items-start gap-3 cursor-pointer" onClick={()=>setExpandedOrder(expandedOrder===o.id?null:o.id)}>
                <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-300 shrink-0">
                  {(o.profiles as any)?.nome?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-white text-sm font-semibold">{(o.profiles as any)?.nome ?? 'Comprador'}</p>
                      <p className="text-gray-500 text-xs">{(o.products as any)?.nome}</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <p className="text-white text-sm font-bold">{format(o.total)}</p>
                      {statusBadge(o.status)}
                    </div>
                  </div>
                  <p className="text-gray-600 text-xs mt-1">{new Date(o.created_at).toLocaleDateString('pt-AO',{day:'2-digit',month:'short',year:'numeric'})}</p>
                </div>
                {expandedOrder === o.id ? <ChevronUp size={16} className="text-gray-500 shrink-0 mt-1"/> : <ChevronDown size={16} className="text-gray-500 shrink-0 mt-1"/>}
              </div>

              {/* Expanded order details */}
              {expandedOrder === o.id && (
                <div className="border-t border-gray-800 p-4 space-y-3">
                  {o.notes && (
                    <div className="rounded-xl bg-gray-950/40 border border-gray-800 p-3">
                      <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Instruções de pagamento desta venda</p>
                      <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed">{o.notes}</p>
                    </div>
                  )}
                  {/* Proof images */}
                  {o.order_proofs && o.order_proofs.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Comprovativos enviados</p>
                      <div className="flex flex-wrap gap-2">
                        {o.order_proofs.map(pr => (
                          <a key={pr.id} href={pr.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 hover:border-gray-600 transition-colors">
                            <FileText size={14} className="text-gray-400"/>
                            <span className="text-gray-300 text-xs">{pr.name ?? 'Comprovativo'}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {o.status === 'paid' && (
                      <>
                        <button onClick={()=>updateOrderStatus(o.id,'delivered')}
                          className="flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-xl transition-colors">
                          <CheckCircle size={12}/> Aprovar Pagamento
                        </button>
                        <button onClick={()=>updateOrderStatus(o.id,'cancelled')}
                          className="flex items-center gap-1.5 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-xl transition-colors">
                          <XCircle size={12}/> Rejeitar
                        </button>
                        <button onClick={()=>updateOrderStatus(o.id,'pending')}
                          className="flex items-center gap-1.5 text-xs bg-gray-700 text-gray-400 hover:bg-gray-600 px-3 py-1.5 rounded-xl transition-colors">
                          <RefreshCw size={12}/> Pedir Novo Comprovativo
                        </button>
                      </>
                    )}
                    {(o.status === 'delivered' || o.status === 'paid') && !o.download_released && (o.products as any)?.tipo === 'digital' && (
                      <button onClick={()=>setReleaseOrder(o)}
                        className="flex items-center gap-1.5 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-1.5 rounded-xl transition-colors">
                        <Download size={12}/> Liberar Download
                      </button>
                    )}
                    {o.download_released && (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-xl">
                        <CheckCircle size={12}/> Download liberado
                      </span>
                    )}
                    {o.conversation_id && (
                      <button onClick={()=>{
                        window.dispatchEvent(new CustomEvent('openChatWith', { detail: { id: o.buyer_id } }));
                        window.dispatchEvent(new CustomEvent('openChat'));
                      }}
                        className="flex items-center gap-1.5 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 px-3 py-1.5 rounded-xl transition-colors">
                        <MessageCircle size={12}/> Abrir Chat
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Downloads tab ── */}
      {tab === 'downloads' && (
        <div className="space-y-3">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs text-gray-500 font-semibold px-4 py-3">Produto</th>
                    <th className="text-left text-xs text-gray-500 font-semibold px-4 py-3">Comprador</th>
                    <th className="text-center text-xs text-gray-500 font-semibold px-4 py-3">Downloads</th>
                    <th className="text-left text-xs text-gray-500 font-semibold px-4 py-3">Expira</th>
                    <th className="text-center text-xs text-gray-500 font-semibold px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-gray-600 py-8 text-sm">Sem tokens emitidos</td></tr>
                  )}
                  {tokens.map(tk => {
                    const expired = tk.expires_at && new Date(tk.expires_at) < new Date();
                    const status = tk.revoked ? 'Revogado' : expired ? 'Expirado' : tk.download_count >= tk.max_downloads ? 'Esgotado' : 'Ativo';
                    const stColor = status==='Ativo'?'text-emerald-400':status==='Revogado'||status==='Esgotado'?'text-red-400':'text-amber-400';
                    return (
                      <tr key={tk.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-white text-xs">{(tk.products as any)?.nome ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{(tk.profiles as any)?.nome ?? '—'}</td>
                        <td className="px-4 py-3 text-center text-gray-300 text-xs">{tk.download_count}/{tk.max_downloads === 999999 ? '∞' : tk.max_downloads}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{tk.expires_at ? new Date(tk.expires_at).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 text-center"><span className={`text-xs font-medium ${stColor}`}>{status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Trash tab ── */}
      {tab === 'trash' && (
        <div className="space-y-3">
          {trash.length > 0 && (
            <div className="flex items-center justify-between gap-3 flex-wrap bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
              <p className="text-gray-400 text-xs">{selectedTrashIds.length} item(ns) na lixeira selecionado(s)</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSelectedTrashIds(trash.map((p) => p.id))} className="text-xs px-3 py-1.5 rounded-xl bg-gray-800 text-gray-300">Selecionar todos</button>
                <button onClick={() => setSelectedTrashIds([])} className="text-xs px-3 py-1.5 rounded-xl bg-gray-800 text-gray-300">Limpar</button>
                <button onClick={bulkRestoreProducts} disabled={selectedTrashIds.length === 0} className="text-xs px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white">Restaurar em massa</button>
                <button onClick={bulkPermanentDeleteProducts} disabled={selectedTrashIds.length === 0} className="text-xs px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white">Apagar definitivamente</button>
              </div>
            </div>
          )}
          {trash.length === 0 && <p className="text-gray-600 text-sm text-center py-12">Lixeira vazia</p>}
          {trash.map(p => (
            <div key={p.id} className="bg-gray-900 border border-gray-700 border-dashed rounded-2xl p-4 flex items-center gap-4 opacity-70">
              <input type="checkbox" checked={selectedTrashIds.includes(p.id)} onChange={(e) => setSelectedTrashIds((prev) => e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id))} className="shrink-0" />
              <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center shrink-0">
                {firstProductImage(p.imagem_url) ? <img src={firstProductImage(p.imagem_url)!} alt="" className="w-full h-full object-cover rounded-xl"/> : <Package size={20} className="text-gray-600"/>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{p.nome}</p>
                <p className="text-gray-500 text-xs">Eliminado {p.deleted_at ? new Date(p.deleted_at).toLocaleDateString() : ''}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={()=>restoreProduct(p.id)} className="flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-xl transition-colors">
                  <RotateCcw size={12}/> Restaurar
                </button>
                <button onClick={()=>permanentDelete(p.id)} className="flex items-center gap-1.5 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-xl transition-colors">
                  <Trash2 size={12}/> Apagar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Store form modal ── */}
      {showStoreForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={()=>setShowStoreForm(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto anim-slide-up" onClick={e=>e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-5 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold">{store ? 'Editar Loja' : 'Criar Loja'}</h2>
              <button onClick={()=>setShowStoreForm(false)} className="text-gray-500 hover:text-white p-1"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                {label:'Nome da Loja *',val:sNome,set:setSNome,ph:'Nome da sua loja'},
                {label:'Slug (URL) *',val:sSlug,set:setSSlug,ph:'minha-loja'},
                {label:'Localização',val:sLocal,set:setSLocal,ph:'Angola, Luanda'},
                {label:'WhatsApp',val:sWA,set:setSWA,ph:'+244 9xx xxx xxx'},
                {label:'Email de Contacto',val:sEmail,set:setSEmail,ph:'email@exemplo.com'},
              ].map(({label,val,set,ph})=>(
                <div key={label}>
                  <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
                  <input value={val} onChange={e=>set(e.target.value)} placeholder={ph} className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500 placeholder-gray-600"/>
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Descrição</label>
                <textarea value={sDesc} onChange={e=>setSDesc(e.target.value)} rows={3} placeholder="Descreva a sua loja..."
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500 placeholder-gray-600 resize-none"/>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Logótipo</label>
                <ImageUpload value={sLogo} onChange={setSLogo} bucket="store-assets" folder="logos"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={()=>setShowStoreForm(false)} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors">Cancelar</button>
                <button onClick={saveStore} disabled={savingStore||!sNome||!sSlug}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm btn-liquid btn-ripple transition-colors">
                  {savingStore ? 'A guardar...' : store ? 'Guardar' : 'Criar Loja'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Product form modal ── */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={()=>setShowProductForm(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto anim-slide-up" onClick={e=>e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-white font-bold">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={()=>setShowProductForm(false)} className="text-gray-500 hover:text-white p-1"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Basic info */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Nome *</label>
                <input value={pNome} onChange={e=>setPNome(e.target.value)} placeholder="Nome do produto" className="input"/>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Descrição</label>
                <textarea value={pDesc} onChange={e=>setPDesc(e.target.value)} rows={3} placeholder="Descreva o produto..." className="input resize-none"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Preço *</label>
                  <input value={pPreco} onChange={e=>setPPreco(e.target.value)} type="number" placeholder="0.00" className="input"/>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Tipo</label>
                  <select value={pTipo} onChange={e=>setPTipo(e.target.value as any)} className="input">
                    <option value="digital">Digital</option>
                    <option value="physical">Físico</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Categoria</label>
                  <select value={pCat} onChange={e=>setPCat(e.target.value)} className="input">
                    {CATS.map(c=><option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Disponibilidade</label>
                  <select value={pDisp} onChange={e=>setPDisp(e.target.value)} className="input">
                    <option value="disponivel">Disponível</option>
                    <option value="esgotado">Esgotado</option>
                    <option value="pre_venda">Pré-venda</option>
                    <option value="descontinuado">Descontinuado</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Subcategoria</label>
                  <input value={pSub} onChange={e=>setPSub(e.target.value)} placeholder="Ex: Contabilidade" className="input"/>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Marca</label>
                  <input value={pMarca} onChange={e=>setPMarca(e.target.value)} placeholder="Nome da marca" className="input"/>
                </div>
              </div>
              {pTipo === 'physical' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Estoque</label>
                    <input value={pEstoque} onChange={e=>setPEstoque(e.target.value)} type="number" placeholder="0" className="input"/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Peso (kg)</label>
                    <input value={pPeso} onChange={e=>setPPeso(e.target.value)} type="number" placeholder="0.0" className="input"/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Transportadora</label>
                    <input value={pTrans} onChange={e=>setPTrans(e.target.value)} placeholder="DHL, CTT..." className="input"/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Tempo de entrega</label>
                    <input value={pEntrega} onChange={e=>setPEntrega(e.target.value)} placeholder="3-5 dias úteis" className="input"/>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Localização</label>
                <input value={pLocal} onChange={e=>setPLocal(e.target.value)} placeholder="Angola, Luanda" className="input"/>
              </div>
              {/* Formats */}
              {pTipo === 'digital' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Formatos incluídos</label>
                  <div className="flex flex-wrap gap-2">
                    {FORMATS.map(f=>(
                      <button key={f} onClick={()=>setPFormatos(prev=>prev.includes(f)?prev.filter(x=>x!==f):[...prev,f])}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${pFormatos.includes(f)?'bg-emerald-500/20 border-emerald-600 text-emerald-400':'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Tags */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Tags (separadas por vírgula)</label>
                <input value={pTags} onChange={e=>setPTags(e.target.value)} placeholder="finança, excel, angola" className="input"/>
              </div>
              {/* Image */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Imagem do produto</label>
                <MultiImageUpload value={pImgs} onChange={setPImgs} bucket="product-images" folder="covers" />
              </div>
              {/* File */}
              {pTipo === 'digital' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Ficheiro do produto</label>
                  <FileUpload value={pArq} onChange={setPArq} bucket="product-files" maxSizeMb={500}/>
                </div>
              )}
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Vídeo demonstrativo</label>
                  <FileUpload currentUrl={pVideo || null} currentName={pVideoName} onChange={(url, name) => { setPVideo(url ?? ''); setPVideoName(name); }} bucket="marketplace-media" path={`${user?.id}/product-media`} maxSizeMb={250} label="Vídeo" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Áudio / voz</label>
                  <FileUpload currentUrl={pAudio || null} currentName={pAudioName} onChange={(url, name) => { setPAudio(url ?? ''); setPAudioName(name); }} bucket="marketplace-media" path={`${user?.id}/product-media`} maxSizeMb={100} label="Áudio" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Documento anexo</label>
                  <FileUpload currentUrl={pDoc || null} currentName={pDocName} onChange={(url, name) => { setPDoc(url ?? ''); setPDocName(name); }} bucket="marketplace-media" path={`${user?.id}/product-media`} maxSizeMb={150} label="Documento" />
                </div>
              </div>
              {/* Destaque toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-2xl border border-gray-700">
                <div>
                  <p className="text-white text-sm font-medium">Produto em destaque</p>
                  <p className="text-gray-500 text-xs mt-0.5">Aparece no topo do marketplace</p>
                </div>
                <div role="switch" aria-checked={pDestaque} onClick={()=>setPDestaque(d=>!d)}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${pDestaque?'bg-emerald-500':'bg-gray-700'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${pDestaque?'translate-x-4':'translate-x-0.5'}`}/>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={()=>setShowProductForm(false)} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors">Cancelar</button>
                <button onClick={saveProduct} disabled={savingProduct||!pNome||!pPreco}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm btn-liquid btn-ripple transition-colors">
                  {savingProduct ? 'A guardar...' : editingProduct ? 'Guardar' : 'Publicar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deleteTarget && (
        <ConfirmDelete
          label={deleteTarget.nome}
          type={deleteTarget.type === 'product' ? 'produto' : 'loja'}
          onConfirm={() => {
            if (deleteTarget.type === 'product') softDeleteProduct(deleteTarget.id);
            else deleteStore();
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Release download modal ── */}
      {releaseOrder && (
        <ReleaseDownloadModal order={releaseOrder} onRelease={releaseDownload} onClose={()=>setReleaseOrder(null)}/>
      )}
    </div>
  );
}
