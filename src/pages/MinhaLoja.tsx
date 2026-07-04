import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Store, Plus, Package, Pencil, Trash2, X, AlertCircle,
  Check, Eye, EyeOff, CheckCircle, Download, Tag, Image,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import ImageUpload from '../components/ImageUpload';
import FileUpload from '../components/FileUpload';

type MyStore = {
  id: string; owner_id: string; slug: string; nome: string;
  descricao: string | null; categoria: string; verified: boolean; ativo: boolean;
  rating: number; total_sales: number; logo_url: string | null; banner_url: string | null;
  created_at: string;
};
type Product = {
  id: string; store_id: string; nome: string; descricao: string | null;
  preco: number; moeda: string; tipo: 'digital' | 'physical'; categoria: string;
  ativo: boolean; destaque: boolean; total_vendas: number;
  imagem_url: string | null; arquivo_url: string | null;
  created_at: string;
};

const CATS_STORE = ['geral','música','tecnologia','moda','educação','arte','outros'];
const CATS_PRODUCT = ['música','beats','instrumentais','cursos','livros','pdfs','templates','arquivos','produtos','outros'];

const emptyStore = () => ({ nome: '', slug: '', descricao: '', categoria: 'geral' });
const emptyProduct = () => ({
  nome: '', descricao: '', preco: '', moeda: 'AOA',
  tipo: 'digital' as const, categoria: 'outros',
  imagem_url: '' as string | null,
  arquivo_url: '' as string | null,
  arquivo_nome: '' as string | null,
});

export default function MinhaLoja() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { format } = useCurrency();
  const [store, setStore] = useState<MyStore | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [storeForm, setStoreForm] = useState(emptyStore());
  const [storeLogo, setStoreLogo] = useState<string | null>(null);
  const [productForm, setProductForm] = useState(emptyProduct());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('stores').select('*').eq('owner_id', user!.id).maybeSingle();
    setStore(data);
    if (data) {
      const { data: prods } = await supabase
        .from('products').select('*').eq('store_id', data.id)
        .order('created_at', { ascending: false });
      setProducts(prods ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreateStore = () => {
    if (store) {
      setStoreForm({ nome: store.nome, slug: store.slug, descricao: store.descricao ?? '', categoria: store.categoria });
      setStoreLogo(store.logo_url);
    } else {
      setStoreForm(emptyStore());
      setStoreLogo(null);
    }
    setShowStoreModal(true);
  };

  const saveStore = async () => {
    setError(null); setSaving(true);
    const slug = storeForm.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const payload = {
      nome: storeForm.nome, slug,
      descricao: storeForm.descricao || null,
      categoria: storeForm.categoria,
      logo_url: storeLogo,
    };
    const { error: err } = store
      ? await supabase.from('stores').update(payload).eq('id', store.id)
      : await supabase.from('stores').insert({ ...payload, owner_id: user!.id });
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false); setShowStoreModal(false);
    showToast(true, store ? t('minhaLoja.lojaAtualizada') : t('minhaLoja.lojaCriada'));
    await load();
  };

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProduct());
    setShowProductModal(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      nome: p.nome, descricao: p.descricao ?? '',
      preco: String(p.preco), moeda: p.moeda,
      tipo: p.tipo, categoria: p.categoria,
      imagem_url: p.imagem_url,
      arquivo_url: p.arquivo_url,
      arquivo_nome: p.arquivo_url ? p.arquivo_url.split('/').pop() ?? null : null,
    });
    setShowProductModal(true);
  };

  const saveProduct = async () => {
    if (!store) return;
    setError(null); setSaving(true);
    const payload = {
      store_id: store.id, owner_id: user!.id,
      nome: productForm.nome,
      descricao: productForm.descricao || null,
      preco: parseFloat(productForm.preco) || 0,
      moeda: productForm.moeda,
      tipo: productForm.tipo,
      categoria: productForm.categoria,
      imagem_url: productForm.imagem_url || null,
      arquivo_url: productForm.arquivo_url || null,
    };
    const { error: err } = editingProduct
      ? await supabase.from('products').update(payload).eq('id', editingProduct.id)
      : await supabase.from('products').insert(payload);
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false); setShowProductModal(false);
    showToast(true, editingProduct ? t('minhaLoja.produtoAtualizado') : t('minhaLoja.produtoCriado'));
    await load();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm(t('minhaLoja.excluirProduto'))) return;
    await supabase.from('products').delete().eq('id', id);
    setProducts(p => p.filter(x => x.id !== id));
    showToast(true, t('minhaLoja.produtoExcluido'));
  };

  const toggleActive = async (p: Product) => {
    await supabase.from('products').update({ ativo: !p.ativo }).eq('id', p.id);
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, ativo: !x.ativo } : x));
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-900 rounded-xl w-48" />
      <div className="h-40 bg-gray-900 rounded-2xl border border-gray-800" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('minhaLoja.title')}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{t('minhaLoja.subtitle')}</p>
        </div>
        {store && (
          <button onClick={openCreateProduct}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            <Plus size={16} /> {t('minhaLoja.novoProduto')}
          </button>
        )}
      </div>

      {toast && (
        <div className={`flex items-center gap-2 p-3.5 rounded-xl border text-sm ${toast.ok ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-red-950/50 border-red-800 text-red-300'}`}>
          {toast.ok ? <Check size={15} /> : <AlertCircle size={15} />} {toast.msg}
        </div>
      )}

      {!store ? (
        <div className="text-center py-16 bg-gray-900 rounded-2xl border border-gray-800">
          <Store size={40} className="text-gray-700 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg mb-2">{t('minhaLoja.lojaTitle')}</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
            {t('minhaLoja.lojaDesc')}
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-8 text-xs text-gray-600">
            {(Array.isArray(t('minhaLoja.features', { returnObjects: true }))
              ? t('minhaLoja.features', { returnObjects: true }) as string[]
              : ['95% para você','Entrega automática','Clientes globais','Pagamentos seguros']
            ).map(f => (
              <span key={f} className="flex items-center gap-1"><Check size={11} className="text-emerald-500" />{f}</span>
            ))}
          </div>
          <button onClick={openCreateStore}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
            <Store size={16} /> {t('minhaLoja.criarLoja')}
          </button>
        </div>
      ) : (
        <>
          {/* Store header */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-emerald-900/40 to-teal-900/30 relative">
              {store.banner_url && <img src={store.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
            </div>
            <div className="px-6 pb-5 -mt-6">
              <div className="flex items-end justify-between mb-3">
                <div className="w-16 h-16 rounded-2xl border-4 border-gray-900 overflow-hidden bg-gray-800 flex items-center justify-center shrink-0">
                  {store.logo_url
                    ? <img src={store.logo_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-white font-bold text-2xl">{store.nome[0]?.toUpperCase()}</span>
                  }
                </div>
                <button onClick={openCreateStore}
                  className="flex items-center gap-2 text-sm text-gray-400 border border-gray-700 px-3 py-2 rounded-xl hover:bg-gray-800 transition-colors">
                  <Pencil size={13} /> {t('minhaLoja.editarLoja')}
                </button>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-bold text-lg">{store.nome}</h3>
                {store.verified && <CheckCircle size={15} className="text-blue-400" />}
              </div>
              <p className="text-gray-500 text-sm">ikfinance.com/{store.slug}</p>
              {store.descricao && <p className="text-gray-400 text-sm mt-2">{store.descricao}</p>}
              <div className="flex gap-5 mt-3 pt-3 border-t border-gray-800">
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{products.filter(p => p.ativo).length}</p>
                  <p className="text-gray-500 text-xs">{t('minhaLoja.ativos')}</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{products.reduce((s, p) => s + p.total_vendas, 0)}</p>
                  <p className="text-gray-500 text-xs">{t('minhaLoja.vendas')}</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{store.rating.toFixed(1)}</p>
                  <p className="text-gray-500 text-xs">{t('minhaLoja.avaliacao')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">{t('minhaLoja.produtos')} ({products.length})</h3>
              <button onClick={openCreateProduct}
                className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                <Plus size={14} /> {t('minhaLoja.adicionar')}
              </button>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-10 bg-gray-900 rounded-2xl border border-gray-800">
                <Package size={28} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">{t('minhaLoja.nenhumProduto')}</p>
                <p className="text-gray-600 text-xs mt-1">{t('minhaLoja.nenhumProdutoDesc')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {products.map(p => (
                  <div key={p.id}
                    className="flex items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-2xl hover:border-gray-700 transition-colors">
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-800 shrink-0 flex items-center justify-center">
                      {p.imagem_url
                        ? <img src={p.imagem_url} alt="" className="w-full h-full object-cover" />
                        : p.tipo === 'digital'
                          ? <Download size={17} className="text-blue-400" />
                          : <Package size={17} className="text-orange-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium text-sm truncate">{p.nome}</p>
                        {!p.ativo && <span className="text-xs text-gray-600 border border-gray-700 px-1.5 py-0.5 rounded-full">{t('minhaLoja.inativo')}</span>}
                        {p.destaque && <span className="text-xs text-amber-400 bg-amber-950/50 border border-amber-800/50 px-1.5 py-0.5 rounded-full">{t('minhaLoja.destaque')}</span>}
                        {p.arquivo_url && <span className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Download size={9} />{t('minhaLoja.ficheiro')}</span>}
                      </div>
                      <p className="text-gray-500 text-xs capitalize mt-0.5">
                        {p.categoria} · {p.tipo === 'digital' ? t('minhaLoja.digital') : t('minhaLoja.fisico')} · {p.total_vendas} {t('minhaLoja.vendas')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-emerald-400 font-bold text-sm">{format(p.preco)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => toggleActive(p)}
                        className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-colors">
                        {p.ativo ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button onClick={() => openEditProduct(p)}
                        className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteProduct(p.id)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-xl transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Store modal ── */}
      {showStoreModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowStoreModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">{store ? t('minhaLoja.editarLoja') : t('minhaLoja.criarLoja')}</h3>
              <button onClick={() => setShowStoreModal(false)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              {/* Logo upload */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block">{t('minhaLoja.logoLoja')}</label>
                <ImageUpload
                  bucket="store-assets"
                  path={`${user!.id}/logo`}
                  currentUrl={storeLogo}
                  onUploaded={(url) => setStoreLogo(url)}
                  shape="square"
                  size="md"
                  placeholder="Logo"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">{t('minhaLoja.nomeLoja')}</label>
                <input value={storeForm.nome}
                  onChange={e => setStoreForm({ ...storeForm, nome: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-') })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">{t('minhaLoja.urlLoja')}</label>
                <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                  <span className="px-3 text-gray-500 text-xs border-r border-gray-700 py-2.5">ikfinance.com/</span>
                  <input value={storeForm.slug}
                    onChange={e => setStoreForm({ ...storeForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="flex-1 bg-transparent text-white px-3 py-2.5 text-sm focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">{t('minhaLoja.categoria')}</label>
                <select value={storeForm.categoria}
                  onChange={e => setStoreForm({ ...storeForm, categoria: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors">
                  {CATS_STORE.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">{t('minhaLoja.descricao')}</label>
                <textarea value={storeForm.descricao}
                  onChange={e => setStoreForm({ ...storeForm, descricao: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none" />
              </div>

              {error && <p className="text-red-400 text-sm flex items-center gap-1.5"><AlertCircle size={14} />{error}</p>}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowStoreModal(false)}
                className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors">
                {t('minhaLoja.cancelar')}
              </button>
              <button onClick={saveStore} disabled={saving || !storeForm.nome}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                {saving ? t('minhaLoja.salvando') : store ? t('minhaLoja.salvar') : t('minhaLoja.criarLoja')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Product modal ── */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowProductModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">{editingProduct ? t('minhaLoja.editarProduto') : t('minhaLoja.novoProduto')}</h3>
              <button onClick={() => setShowProductModal(false)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              {/* Product image */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block">{t('minhaLoja.imagemProduto')}</label>
                <ImageUpload
                  bucket="product-images"
                  path={`${user!.id}/${editingProduct?.id ?? 'new'}`}
                  currentUrl={productForm.imagem_url}
                  onUploaded={(url) => setProductForm(f => ({ ...f, imagem_url: url }))}
                  shape="square"
                  size="lg"
                  placeholder="Imagem"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">{t('minhaLoja.nomeProduto')}</label>
                <input value={productForm.nome}
                  onChange={e => setProductForm({ ...productForm, nome: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">{t('minhaLoja.tipo')}</label>
                  <select value={productForm.tipo}
                    onChange={e => setProductForm({ ...productForm, tipo: e.target.value as 'digital' | 'physical' })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors">
                    <option value="digital">{t('minhaLoja.digital')}</option>
                    <option value="physical">{t('minhaLoja.fisico')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">{t('minhaLoja.categoria')}</label>
                  <select value={productForm.categoria}
                    onChange={e => setProductForm({ ...productForm, categoria: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors">
                    {CATS_PRODUCT.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">{t('minhaLoja.preco')}</label>
                  <input type="number" value={productForm.preco}
                    onChange={e => setProductForm({ ...productForm, preco: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">{t('minhaLoja.moeda')}</label>
                  <select value={productForm.moeda}
                    onChange={e => setProductForm({ ...productForm, moeda: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors">
                    {['AOA','USD','EUR','BRL','GBP'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">{t('minhaLoja.descricao')}</label>
                <textarea value={productForm.descricao ?? ''}
                  onChange={e => setProductForm({ ...productForm, descricao: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none" />
              </div>

              {/* File upload for digital products */}
              {productForm.tipo === 'digital' && (
                <FileUpload
                  bucket="product-files"
                  path={`${user!.id}/${editingProduct?.id ?? 'new'}`}
                  currentUrl={productForm.arquivo_url}
                  currentName={productForm.arquivo_nome}
                  onUploaded={(url, name) => setProductForm(f => ({ ...f, arquivo_url: url, arquivo_nome: name }))}
                  maxMb={100}
                  label={t('minhaLoja.ficheiroLabel')}
                />
              )}

              {error && <p className="text-red-400 text-sm flex items-center gap-1.5"><AlertCircle size={14} />{error}</p>}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowProductModal(false)}
                className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors">
                {t('minhaLoja.cancelar')}
              </button>
              <button onClick={saveProduct} disabled={saving || !productForm.nome || !productForm.preco}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                {saving ? t('minhaLoja.salvando') : editingProduct ? t('minhaLoja.salvar') : t('minhaLoja.criarProduto')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
