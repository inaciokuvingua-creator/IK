import { useEffect, useState } from 'react';
import {
  Loader2, Globe, Clock, HelpCircle, MapPin, Mail, Phone, Share2, Copy, Check,
  ExternalLink, ShoppingBag, Users, Star, MessageCircle, Building2, Eye,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type Kind = 'store' | 'company';

type Entity = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  logo_url: string | null;
  cover_url: string | null;
  brand_color: string | null;
  accent_color: string | null;
  theme_mode: string | null;
  layout: string | null;
  font_family: string | null;
  slogan: string | null;
  hours: Record<string, string> | null;
  social_links: Record<string, string> | null;
  faq: Array<{ q: string; a: string }> | null;
  highlights: string[] | null;
  meta_title: string | null;
  meta_description: string | null;
  custom_css: string | null;
  // store-only
  whatsapp?: string | null;
  email_contato?: string | null;
  localizacao?: string | null;
  categoria?: string | null;
  rating?: number;
  avg_rating?: number;
  review_count?: number;
  total_sales?: number;
  // company-only
  setor?: string | null;
  website?: string | null;
  nif?: string | null;
  owner_id?: string | null;
  showcase?: string[] | null;
};

type Product = {
  id: string; nome: string; descricao: string | null;
  preco: number; moeda: string; imagem_url: string | null;
  tipo: string; destaque: boolean; ativo: boolean;
};

type Member = {
  id: string; user_id: string; role: string; cargo: string | null;
  department: string | null; status: string;
};

type Department = { id: string; nome: string; descricao: string | null };

export default function PublicProfile({ kind, slug }: { kind: Kind; slug: string }) {
  const [entity, setEntity] = useState<Entity | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const table = kind === 'store' ? 'stores' : 'companies';
  const isStore = kind === 'store';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .maybeSingle();
        if (error || !data) {
          setNotFound(true);
          return;
        }
        setEntity(data as Entity);

        if (isStore) {
          const { data: prods } = await supabase
            .from('products')
            .select('id,nome,descricao,preco,moeda,imagem_url,tipo,destaque,ativo')
            .eq('store_id', data.id)
            .eq('ativo', true)
            .is('deleted_at', null)
            .order('destaque', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(50);
          setProducts(prods as Product[] ?? []);
        } else {
          const [m, d] = await Promise.all([
            supabase.from('company_members').select('id,user_id,role,cargo,department,status').eq('company_id', data.id).eq('status', 'active'),
            supabase.from('departments').select('id,nome,descricao').eq('company_id', data.id).order('nome'),
          ]);
          setMembers(m.data as Member[] ?? []);
          setDepartments(d.data as Department[] ?? []);
        }
      } catch (e) {
        console.error('load public profile', e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    if (slug) load();
  }, [kind, slug, table, isStore]);

  // Aplica CSS personalizado + define meta tags
  useEffect(() => {
    if (!entity) return;
    if (entity.custom_css) {
      const style = document.createElement('style');
      style.id = 'entity-custom-css';
      style.textContent = entity.custom_css;
      document.head.appendChild(style);
      return () => { document.getElementById('entity-custom-css')?.remove(); };
    }
  }, [entity]);

  useEffect(() => {
    if (!entity) return;
    document.title = entity.meta_title || `${entity.nome} — IK Finance`;
    if (entity.meta_description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', entity.meta_description);
    }
  }, [entity]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: entity?.meta_title || entity?.nome || 'IK Finance',
          text: entity?.slogan || entity?.descricao || '',
          url: window.location.href,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  const openChat = () => {
    if (entity?.owner_id) {
      window.dispatchEvent(new CustomEvent('openChatWith', { detail: { id: entity.owner_id } }));
    }
  };

  const openProduct = (productId: string) => {
    window.dispatchEvent(new CustomEvent('openMarketplaceProduct', { detail: { id: productId } }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="animate-spin text-emerald-400" size={32} />
      </div>
    );
  }

  if (notFound || !entity) {
    return (
      <div className="text-center py-32 px-4">
        <Globe size={40} className="text-gray-700 mx-auto mb-4" />
        <h1 className="text-white text-xl font-semibold mb-2">Página não encontrada</h1>
        <p className="text-gray-500 text-sm mb-6">
          {isStore ? 'Esta loja' : 'Esta empresa'} não está publicada ou o link é inválido.
        </p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('navigatePage', { detail: { page: 'marketplace' } }))}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm rounded-xl"
        >
          Ir para o Marketplace
        </button>
      </div>
    );
  }

  const brand = entity.brand_color || '#10b981';
  const accent = entity.accent_color || '#0ea5e9';
  const isLight = entity.theme_mode === 'light';
  const layout = entity.layout || 'grid';
  const highlights = entity.highlights ?? (entity.showcase as string[] | null) ?? [];
  const social = entity.social_links ?? {};
  const hours = entity.hours ?? {};
  const faq = entity.faq ?? [];
  const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  const bgClass = isLight ? 'bg-gray-50 text-gray-900' : 'bg-gray-950 text-white';
  const cardClass = isLight ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800';
  const mutedClass = isLight ? 'text-gray-500' : 'text-gray-400';

  return (
    <div className={bgClass} style={{ fontFamily: entity.font_family === 'mono' ? 'monospace' : undefined }}>
      {/* Hero / capa */}
      <div className="relative h-48 sm:h-64 lg:h-80 overflow-hidden">
        {entity.cover_url ? (
          <img src={entity.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${brand}, ${accent})` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Logo + nome + slogan sobreposto */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto flex items-end gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gray-900 border-2 border-white/20 shrink-0 flex items-center justify-center text-2xl font-bold">
              {entity.logo_url ? (
                <img src={entity.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span style={{ color: brand }}>{entity.nome?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-xl sm:text-2xl lg:text-3xl font-bold truncate drop-shadow-lg">
                {entity.nome}
              </h1>
              {entity.slogan && (
                <p className="text-white/80 text-sm sm:text-base mt-0.5 truncate drop-shadow">{entity.slogan}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: brand, color: '#fff' }}
                >
                  {isStore ? (entity.categoria || 'Loja') : (entity.setor || 'Empresa')}
                </span>
                {isStore && entity.avg_rating ? (
                  <span className="flex items-center gap-1 text-white/90 text-xs">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    {Number(entity.avg_rating).toFixed(1)} ({entity.review_count ?? 0})
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de ações */}
      <div className="sticky top-14 sm:top-16 z-20 backdrop-blur border-b" style={{ borderColor: isLight ? '#e5e7eb' : '#1f2937', backgroundColor: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(17,24,39,0.9)' }}>
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-2">
          <button onClick={copyLink} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${cardClass} border hover:opacity-80`}>
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copied ? 'Copiado' : 'Copiar link'}
          </button>
          <button onClick={shareNative} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${cardClass} border hover:opacity-80`}>
            <Share2 size={13} /> Partilhar
          </button>
          <button onClick={openChat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white" style={{ backgroundColor: brand }}>
            <MessageCircle size={13} /> Contactar
          </button>
          {social.website && (
            <a href={social.website} target="_blank" rel="noreferrer" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${cardClass} border hover:opacity-80`}>
              <ExternalLink size={13} /> Site
            </a>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Descrição + destaques */}
        {entity.descricao && (
          <div className={`rounded-2xl border p-5 ${cardClass}`}>
            <p className={`text-sm leading-relaxed ${mutedClass}`}>{entity.descricao}</p>
          </div>
        )}

        {highlights.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {highlights.filter(Boolean).map((h, i) => (
              <div key={i} className={`rounded-2xl border p-4 text-center ${cardClass}`}>
                <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${brand}20` }}>
                  <Star size={18} style={{ color: brand }} />
                </div>
                <p className="text-sm font-medium">{h}</p>
              </div>
            ))}
          </div>
        )}

        {/* Conteúdo principal: produtos (loja) ou equipa+departamentos (empresa) */}
        {isStore ? (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingBag size={18} style={{ color: brand }} /> Produtos
              </h2>
              <span className={`text-xs ${mutedClass}`}>{products.length} disponíveis</span>
            </div>
            {products.length === 0 ? (
              <div className={`text-center py-12 rounded-2xl border ${cardClass}`}>
                <ShoppingBag size={28} className="mx-auto mb-2 opacity-30" />
                <p className={`text-sm ${mutedClass}`}>Sem produtos publicados</p>
              </div>
            ) : layout === 'list' ? (
              <div className="space-y-3">
                {products.map(p => <ProductRow key={p.id} product={p} brand={brand} muted={mutedClass} card={cardClass} onClick={() => openProduct(p.id)} />)}
              </div>
            ) : (
              <div className={`grid gap-3 ${layout === 'hero' ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'} ${layout === 'magazine' ? 'sm:grid-cols-2' : ''}`}>
                {products.map(p => <ProductCard key={p.id} product={p} brand={brand} muted={mutedClass} card={cardClass} onClick={() => openProduct(p.id)} />)}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Equipa */}
            {members.length > 0 && (
              <section>
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Users size={18} style={{ color: brand }} /> Equipa ({members.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {members.map(m => (
                    <div key={m.id} className={`rounded-2xl border p-4 text-center ${cardClass}`}>
                      <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold" style={{ backgroundColor: brand }}>
                        {(m.cargo ?? m.role)?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                      <p className="text-sm font-medium truncate">{m.cargo ?? m.role}</p>
                      <p className={`text-xs ${mutedClass} truncate`}>{m.department ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Departamentos */}
            {departments.length > 0 && (
              <section>
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Building2 size={18} style={{ color: brand }} /> Departamentos
                </h2>
                <div className="flex flex-wrap gap-2">
                  {departments.map(d => (
                    <span key={d.id} className={`rounded-xl border px-3 py-2 text-sm ${cardClass}`}>
                      {d.nome}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Horários */}
        {Object.keys(hours).length > 0 && (
          <section className={`rounded-2xl border p-5 ${cardClass}`}>
            <h2 className="text-base font-bold flex items-center gap-2 mb-3">
              <Clock size={16} style={{ color: brand }} /> Horário
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {DAYS.map(day => (
                <div key={day} className="flex justify-between">
                  <span className={mutedClass}>{day}</span>
                  <span className="font-medium">{hours[day] || 'Fechado'}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {faq.length > 0 && (
          <section className={`rounded-2xl border p-5 ${cardClass}`}>
            <h2 className="text-base font-bold flex items-center gap-2 mb-3">
              <HelpCircle size={16} style={{ color: brand }} /> Perguntas frequentes
            </h2>
            <div className="space-y-3">
              {faq.filter(item => item.q).map((item, i) => (
                <details key={i} className="group">
                  <summary className="cursor-pointer text-sm font-medium list-none flex items-center justify-between">
                    {item.q}
                    <span className="text-gray-500 group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <p className={`text-sm mt-2 ${mutedClass}`}>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Contactos + redes sociais */}
        <section className={`rounded-2xl border p-5 ${cardClass}`}>
          <h2 className="text-base font-bold flex items-center gap-2 mb-3">
            <Mail size={16} style={{ color: brand }} /> Contactos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {entity.localizacao && (
              <div className="flex items-center gap-2"><MapPin size={14} className={mutedClass} /> {entity.localizacao}</div>
            )}
            {entity.email_contato && (
              <a href={`mailto:${entity.email_contato}`} className="flex items-center gap-2 hover:underline"><Mail size={14} className={mutedClass} /> {entity.email_contato}</a>
            )}
            {entity.whatsapp && (
              <a href={`https://wa.me/${entity.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline"><Phone size={14} className={mutedClass} /> {entity.whatsapp}</a>
            )}
            {entity.website && (
              <a href={entity.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline"><Globe size={14} className={mutedClass} /> {entity.website}</a>
            )}
            {social.instagram && <span className="flex items-center gap-2"><Users size={14} className={mutedClass} /> {social.instagram}</span>}
            {social.facebook && <a href={social.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline"><Globe size={14} className={mutedClass} /> Facebook</a>}
            {social.whatsapp && <a href={`https://wa.me/${social.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline"><Phone size={14} className={mutedClass} /> WhatsApp</a>}
            {social.linkedin && <a href={social.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline"><Globe size={14} className={mutedClass} /> LinkedIn</a>}
            {social.youtube && <a href={social.youtube} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline"><Globe size={14} className={mutedClass} /> YouTube</a>}
            {social.tiktok && <span className="flex items-center gap-2"><Users size={14} className={mutedClass} /> TikTok: {social.tiktok}</span>}
          </div>
        </section>

        {/* Stats (loja) */}
        {isStore && (entity.total_sales || entity.review_count) && (
          <section className={`rounded-2xl border p-5 ${cardClass}`}>
            <div className="grid grid-cols-3 gap-3 text-center">
              {entity.total_sales != null && (
                <div>
                  <p className="text-2xl font-bold" style={{ color: brand }}>{entity.total_sales}</p>
                  <p className={`text-xs ${mutedClass}`}>Vendas</p>
                </div>
              )}
              {entity.review_count != null && (
                <div>
                  <p className="text-2xl font-bold" style={{ color: brand }}>{entity.review_count}</p>
                  <p className={`text-xs ${mutedClass}`}>Avaliações</p>
                </div>
              )}
              {entity.avg_rating != null && (
                <div>
                  <p className="text-2xl font-bold" style={{ color: brand }}>{Number(entity.avg_rating).toFixed(1)}</p>
                  <p className={`text-xs ${mutedClass}`}>Avaliação</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Rodapé com selo IK Finance */}
        <footer className={`text-center py-6 text-xs ${mutedClass}`}>
          <p className="flex items-center justify-center gap-1.5">
            <Eye size={12} /> Página pública criada em IK Finance
          </p>
        </footer>
      </div>
    </div>
  );
}

function ProductCard({ product, brand, muted, card, onClick }: {
  product: Product; brand: string; muted: string; card: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`rounded-2xl border overflow-hidden text-left transition-transform hover:scale-[1.02] ${card}`}>
      <div className="aspect-square bg-gray-800 overflow-hidden">
        {product.imagem_url ? (
          <img src={product.imagem_url} alt={product.nome} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${brand}20` }}>
            <ShoppingBag size={28} style={{ color: brand }} />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-sm font-medium truncate">{product.nome}</p>
        <p className={`text-xs ${muted} truncate`}>{product.tipo}</p>
        <p className="text-sm font-bold mt-1" style={{ color: brand }}>
          {product.moeda} {Number(product.preco).toLocaleString('pt-AO', { maximumFractionDigits: 2 })}
        </p>
      </div>
    </button>
  );
}

function ProductRow({ product, brand, muted, card, onClick }: {
  product: Product; brand: string; muted: string; card: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`flex gap-3 rounded-2xl border p-3 text-left transition-colors hover:opacity-80 ${card}`}>
      <div className="w-20 h-20 rounded-xl bg-gray-800 overflow-hidden shrink-0">
        {product.imagem_url ? (
          <img src={product.imagem_url} alt={product.nome} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${brand}20` }}>
            <ShoppingBag size={20} style={{ color: brand }} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{product.nome}</p>
        {product.descricao && <p className={`text-xs ${muted} line-clamp-2 mt-0.5`}>{product.descricao}</p>}
        <p className="text-sm font-bold mt-1" style={{ color: brand }}>
          {product.moeda} {Number(product.preco).toLocaleString('pt-AO', { maximumFractionDigits: 2 })}
        </p>
      </div>
    </button>
  );
}
