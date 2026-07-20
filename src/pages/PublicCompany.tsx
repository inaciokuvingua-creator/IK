import { useEffect, useState } from 'react';
import { Building2, ExternalLink, Loader2, MapPin, Mail, Shield, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Company = {
  id: string;
  nome: string;
  descricao: string | null;
  logo_url: string | null;
  cover_url: string | null;
  nif: string | null;
  setor: string;
  website: string | null;
  verified: boolean;
  brand_color: string;
  accent_color: string;
  bg_color: string;
  layout: string;
  slogan: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  gallery_urls: string[] | null;
  highlights: string[] | null;
  showcase: string[] | null;
  social_links: Record<string, string> | null;
  hours: Record<string, string> | null;
  meta_title: string | null;
  meta_description: string | null;
};

const FONT_STACKS: Record<string, string> = {
  inter: 'Inter, system-ui, sans-serif',
  poppins: 'Poppins, system-ui, sans-serif',
  playfair: '"Playfair Display", Georgia, serif',
  mono: 'ui-monospace, monospace',
};

export default function PublicCompany({ slug, companyId }: { slug?: string; companyId?: string }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let data: Company | null = null;
        if (slug) {
          const { data: rpcData, error } = await supabase.rpc('get_company_by_slug', { p_slug: slug });
          if (error) throw error;
          data = (rpcData as Company[])?.[0] ?? null;
        } else if (companyId) {
          const { data: rpcData, error } = await supabase.rpc('get_company_public', { p_company_id: companyId });
          if (error) throw error;
          data = (rpcData as Company[])?.[0] ?? null;
        }
        if (!data) { setNotFound(true); return; }
        setCompany(data);

        // Carregar membros e departamentos (leitura pública se a empresa estiver publicada)
        const [m, d] = await Promise.all([
          supabase.from('company_members').select('user_id,role,department,cargo,status').eq('company_id', data.id).eq('status', 'active'),
          supabase.from('departments').select('nome,descricao').eq('company_id', data.id).order('nome'),
        ]);
        setMembers(m.data ?? []);
        setDepartments(d.data ?? []);
      } catch (e) {
        console.error('load public company', e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, companyId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="animate-spin text-blue-400" size={28} />
      </div>
    );
  }

  if (notFound || !company) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-center p-6">
        <Building2 size={48} className="text-gray-700 mb-4" />
        <h1 className="text-white text-xl font-semibold mb-2">Empresa não encontrada</h1>
        <p className="text-gray-500 text-sm">A empresa que procuras não existe, foi removida ou não está publicada.</p>
      </div>
    );
  }

  const theme = company.brand_color || '#3b82f6';
  const accent = company.accent_color || '#8b5cf6';
  const bg = company.bg_color || '#0f172a';
  const layout = company.layout || 'grid';
  const fontStack = FONT_STACKS[company.font_family || 'inter'] || FONT_STACKS.inter;
  const social = company.social_links ?? {};
  const gallery = company.gallery_urls ?? [];
  const highlights = company.highlights ?? company.showcase ?? [];
  const hours = company.hours ?? {};
  const heroTitle = company.hero_title || company.nome;
  const heroSubtitle = company.hero_subtitle || company.slogan || company.descricao || '';

  return (
    <div style={{ backgroundColor: bg, fontFamily: fontStack }} className="min-h-screen text-white">
      {/* Hero */}
      <header className="relative overflow-hidden">
        {layout === 'hero' || layout === 'magazine' ? (
          <div className="relative h-64 sm:h-80">
            {company.cover_url ? (
              <img src={company.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme}, ${accent})` }} />
            )}
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative h-full flex flex-col items-center justify-center text-center p-6">
              {company.logo_url && (
                <img src={company.logo_url} alt={company.nome} className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-xl mb-4" />
              )}
              <h1 className="text-3xl sm:text-4xl font-bold drop-shadow-lg">{heroTitle}</h1>
              {heroSubtitle && <p className="mt-2 text-white/90 max-w-xl text-sm sm:text-base">{heroSubtitle}</p>}
              <div className="flex items-center gap-3 mt-4 text-xs text-white/80">
                <span className="capitalize bg-white/20 px-2 py-1 rounded-full">{company.setor}</span>
                {company.verified && <span className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">✓ Verificada</span>}
              </div>
            </div>
          </div>
        ) : (
          <div className="border-b" style={{ borderColor: `${theme}40`, background: `linear-gradient(135deg, ${theme}22, ${accent}22)` }}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center gap-5">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 shrink-0" style={{ borderColor: theme }}>
                {company.logo_url
                  ? <img src={company.logo_url} alt={company.nome} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: theme }}>{company.nome[0]?.toUpperCase()}</div>
                }
              </div>
              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h1 className="text-2xl sm:text-3xl font-bold">{heroTitle}</h1>
                  {company.verified && <span className="text-sm" style={{ color: theme }}>✓</span>}
                </div>
                {heroSubtitle && <p className="mt-1 text-white/80 text-sm">{heroSubtitle}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-white/60 justify-center sm:justify-start flex-wrap">
                  <span className="capitalize flex items-center gap-1"><Building2 size={11} /> {company.setor}</span>
                  {company.nif && <span className="flex items-center gap-1"><Shield size={11} /> NIF: {company.nif}</span>}
                  {company.website && <span className="flex items-center gap-1"><ExternalLink size={11} /> {company.website.replace(/^https?:\/\//, '')}</span>}
                </div>
              </div>
              {company.website && (
                <a href={company.website} target="_blank" rel="noreferrer" className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors" style={{ backgroundColor: theme }}>
                  <ExternalLink size={15} /> Website
                </a>
              )}
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

        {/* Sobre */}
        {company.descricao && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Sobre</h2>
            <p className="text-white/80 text-sm leading-relaxed">{company.descricao}</p>
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

        {/* Departamentos */}
        {departments.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Departamentos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {departments.map((d, i) => (
                <div key={i} className="p-4 rounded-xl bg-black/30 border border-white/5">
                  <p className="font-medium">{d.nome}</p>
                  {d.descricao && <p className="text-white/60 text-xs mt-1">{d.descricao}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Equipa */}
        {members.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Users size={18} style={{ color: theme }} /> Equipa ({members.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {members.map((m, i) => (
                <div key={i} className="p-3 rounded-xl bg-black/30 border border-white/5 text-center">
                  <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold" style={{ backgroundColor: `${theme}33`, color: theme }}>
                    {(m.cargo || m.role || '?')[0]?.toUpperCase()}
                  </div>
                  <p className="text-sm font-medium truncate">{m.cargo || m.role}</p>
                  <p className="text-xs text-white/50 truncate">{m.department ?? '—'}</p>
                </div>
              ))}
            </div>
          </section>
        )}

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
        <p>{company.nome} · Powered by IK Finance</p>
      </footer>
    </div>
  );
}
