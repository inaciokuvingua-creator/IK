import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, MapPin, MessageCircle, Package, ShoppingBag, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Store = {
  id: string;
  nome: string;
  descricao: string | null;
  logo_url: string | null;
  cover_url: string | null;
  banner_url: string | null;
  slug: string;
  categoria: string;
  localizacao: string | null;
  whatsapp: string | null;
  email_contato: string | null;
  verified: boolean;
  avg_rating: number;
  review_count: number;
  total_sales: number;
  brand_color: string;
  accent_color: string;
  bg_color: string;
  layout: string;
  slogan: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  gallery_urls: string[] | null;
  highlights: string[] | null;
  social_links: Record<string, string> | null;
  hours: Record<string, string> | null;
  meta_title: string | null;
  meta_description: string | null;
};

type Product = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  moeda: string;
  tipo: string;
  categoria: string;
  imagem_url: string | null;
  destaque: boolean;
  total_vendas: number;
  avg_rating: number;
};

const FONT_STACKS: Record<string, string> = {
  inter: 'Inter, system-ui, sans-serif',
  poppins: 'Poppins, system-ui, sans-serif',
  playfair: '"Playfair Display", Georgia, serif',
  mono: 'ui-monospace, monospace',
};

export default function PublicStore({ slug, storeId }: { slug?: string; storeId?: string }) {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let data: Store | null = null;
        if (slug) {
          const { data: rpcData, error } = await supabase.rpc('get_store_by_slug', { p_slug: slug });
          if (error) throw error;
          data = (rpcData as Store[])?.[0] ?? null;
        } else if (storeId) {
          const { data: row, error } = await supabase
            .from('stores')
            .select('*')
            .eq('id', storeId)
            .eq('is_published', true)
            .maybeSingle();
          if (error) throw error;
          data = row as Store;
        }
        if (!data) { setNotFound(true); return; }
        setStore(data);
        const { data: prods, error: pErr } = await supabase.rpc('get_store_products', { p_store_id: data.id });
        if (pErr) throw pErr;
        setProducts((prods as Product[]) ?? []);
      } catch (e) {
        console.error('load public store', e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, storeId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="animate-spin text-emerald-400" size={28} />
      </div>
    );
  }

  if (notFound || !store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-center p-6">
        <ShoppingBag size={48} className="text-gray-700 mb-4" />
        <h1 className="text-white text-xl font-semibold mb-2">Loja não encontrada</h1>
        <p className="text-gray-500 text-sm">A loja que procuras não existe, foi removida ou não está publicada.</p>
      </div>
    );
  }

  const theme = store.brand_color || '#10b981';
  const accent = store.accent_color || '#0ea5e9';
  const bg = store.bg_color || '#0f172a';
  const layout = store.layout || 'grid';
  const fontStack = FONT_STACKS[store.font_family || 'inter'] || FONT_STACKS.inter;
  const social = store.social_links ?? {};
  const gallery = store.gallery_urls ?? [];
  const highlights = store.highlights ?? [];
  const hours = store.hours ?? {};
  const heroTitle = store.hero_title || store.nome;
  const heroSubtitle = store.hero_subtitle || store.slogan || store.descricao || '';

  const openChat = () => {
    // Tentar abrir no app; se não estiver autenticado, abre o login
    window.location.href = `/?page=chat`;
  };

  return (
    <div style={{ backgroundColor: bg, fontFamily: fontStack }} className="min-h-screen text-white">
      {/* Hero */}
      <header className="relative overflow-hidden">
        {layout === 'hero' || layout === 'magazine' ? (
          <div className="relative h-64 sm:h-80">
            {store.cover_url ? (
              <img src={store.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme}, ${accent})` }} />
            )}
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative h-full flex flex-col items-center justify-center text-center p-6">
              {store.logo_url && (
                <img src={store.logo_url} alt={store.nome} className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-xl mb-4" />
              )}
              <h1 className="text-3xl sm:text-4xl font-bold drop-shadow-lg">{heroTitle}</h1>
              {heroSubtitle && <p className="mt-2 text-white/90 max-w-xl text-sm sm:text-base">{heroSubtitle}</p>}
              <div className="flex items-center gap-3 mt-4 text-xs text-white/80">
                {store.verified && <span className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">✓ Verificada</span>}
                {store.localizacao && <span className="flex items-center gap-1"><MapPin size={12} /> {store.localizacao}</span>}
              </div>
            </div>
          </div>
        ) : (
          <div className="border-b" style={{ borderColor: `${theme}40`, background: `linear-gradient(135deg, ${theme}22, ${accent}22)` }}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center gap-5">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 shrink-0" style={{ borderColor: theme }}>
                {store.logo_url
                  ? <img src={store.logo_url} alt={store.nome} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: theme }}>{store.nome[0]?.toUpperCase()}</div>
                }
              </div>
              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h1 className="text-2xl sm:text-3xl font-bold">{heroTitle}</h1>
                  {store.verified && <span className="text-sm" style={{ color: theme }}>✓</span>}
                </div>
                {heroSubtitle && <p className="mt-1 text-white/80 text-sm">{heroSubtitle}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-white/60 justify-center sm:justify-start flex-wrap">
                  {store.localizacao && <span className="flex items-center gap-1"><MapPin size={11} /> {store.localizacao}</span>}
                  {store.review_count > 0 && (
                    <span className="flex items-center gap-1"><Star size={11} className="text-amber-400" /> {store.avg_rating.toFixed(1)} ({store.review_count})</span>
                  )}
                  <span className="flex items-center gap-1"><ShoppingBag size={11} /> {store.total_sales} vendas</span>
                </div>
              </div>
              <button onClick={openChat} className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors" style={{ backgroundColor: theme }}>
                <MessageCircle size={15} /> Contactar
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Destaques */}
        {highlights.length > 0 && (
          <section>
            <div className="flex flex-wrap gap-2">
              {highlights.map((h, i) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: `${theme}22`, color: theme }}>
                  {h}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Galeria */}
        {gallery.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Galeria</h2>
            <div className={`grid gap-3 ${gallery.length > 2 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
              {gallery.map((src, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-black/30">
                  <img src={src} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Produtos */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Package size={18} style={{ color: theme }} /> Produtos</h2>
          {products.length === 0 ? (
            <p className="text-white/50 text-sm">Esta loja ainda não tem produtos publicados.</p>
          ) : layout === 'list' ? (
            <div className="space-y-3">
              {products.map(p => (
                <div key={p.id} className="flex gap-4 p-3 rounded-xl bg-black/30 border border-white/5">
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-black/40 shrink-0">
                    {p.imagem_url && <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.nome}</p>
                    {p.descricao && <p className="text-white/60 text-xs mt-0.5 line-clamp-2">{p.descricao}</p>}
                    <p className="mt-1 font-bold" style={{ color: theme }}>{p.moeda} {p.preco.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map(p => (
                <div key={p.id} className="rounded-xl bg-black/30 border border-white/5 overflow-hidden hover:border-white/20 transition-colors">
                  <div className="aspect-square bg-black/40">
                    {p.imagem_url && <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate">{p.nome}</p>
                    <p className="text-xs mt-1 font-bold" style={{ color: theme }}>{p.moeda} {p.preco.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Horários */}
        {Object.keys(hours).length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Horário de funcionamento</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(hours).map(([day, time]) => (
                <div key={day} className="flex justify-between text-sm px-3 py-2 rounded-lg bg-black/30">
                  <span className="text-white/70">{day}</span>
                  <span>{time || 'Fechado'}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Redes sociais */}
        {Object.keys(social).length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Contactos e redes</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(social).filter(([_, v]) => v).map(([key, value]) => (
                <a key={key} href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noreferrer"
                   className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/30 hover:bg-black/50 text-sm transition-colors capitalize">
                  <ExternalLink size={13} style={{ color: theme }} /> {key}
                </a>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-white/40">
        <p>{store.nome} · Powered by IK Finance</p>
      </footer>
    </div>
  );
}
