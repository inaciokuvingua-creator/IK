import { useState } from 'react';
import {
  Palette, Layout, Globe, Clock, HelpCircle, Sparkles, Eye, Share2,
  Loader2, Check, X, Image as ImageIcon, ExternalLink, Copy,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import MultiImageUpload from './MultiImageUpload';

type EntityKind = 'store' | 'company';

type Props = {
  kind: EntityKind;
  entityId: string;
  ownerId: string;
  initial: {
    name: string;
    slug: string | null;
    is_published: boolean;
    cover_url?: string | null;
    brand_color?: string | null;
    accent_color?: string | null;
    theme_mode?: string | null;
    layout?: string | null;
    font_family?: string | null;
    slogan?: string | null;
    hours?: any;
    social_links?: any;
    faq?: any[] | null;
    highlights?: any[] | null;
    showcase?: any[] | null;
    meta_title?: string | null;
    meta_description?: string | null;
    custom_css?: string | null;
  };
};

const PRESET_COLORS = [
  { name: 'Esmeralda', brand: '#10b981', accent: '#0ea5e9' },
  { name: 'Azul', brand: '#3b82f6', accent: '#8b5cf6' },
  { name: 'Violeta', brand: '#8b5cf6', accent: '#ec4899' },
  { name: 'Rosa', brand: '#ec4899', accent: '#f59e0b' },
  { name: 'Âmbar', brand: '#f59e0b', accent: '#ef4444' },
  { name: 'Vermelho', brand: '#ef4444', accent: '#3b82f6' },
  { name: 'Ciano', brand: '#06b6d4', accent: '#10b981' },
  { name: 'Lima', brand: '#84cc16', accent: '#06b6d4' },
];

const LAYOUTS = [
  { id: 'grid', label: 'Grelha', desc: 'Produtos/serviços em cartões' },
  { id: 'list', label: 'Lista', desc: 'Uma coluna, detalhes completos' },
  { id: 'magazine', label: 'Revista', desc: 'Hero grande + destaques' },
  { id: 'hero', label: 'Hero', desc: 'Banner imersivo em cima' },
];

const FONTS = [
  { id: 'inter', label: 'Inter (moderno)' },
  { id: 'poppins', label: 'Poppins (arredondado)' },
  { id: 'playfair', label: 'Playfair (elegante)' },
  { id: 'mono', label: 'Mono (técnico)' },
];

const THEME_MODES = [
  { id: 'dark', label: 'Escuro' },
  { id: 'light', label: 'Claro' },
  { id: 'auto', label: 'Automático' },
];

export default function EntityCustomizer({ kind, entityId, ownerId, initial }: Props) {
  const table = kind === 'store' ? 'stores' : 'companies';
  const label = kind === 'store' ? 'loja' : 'empresa';

  const [cover, setCover] = useState(initial.cover_url ?? '');
  const [brandColor, setBrandColor] = useState(initial.brand_color ?? '#10b981');
  const [accentColor, setAccentColor] = useState(initial.accent_color ?? '#0ea5e9');
  const [themeMode, setThemeMode] = useState(initial.theme_mode ?? 'dark');
  const [layoutMode, setLayoutMode] = useState(initial.layout ?? 'grid');
  const [fontFamily, setFontFamily] = useState(initial.font_family ?? 'inter');
  const [slogan, setSlogan] = useState(initial.slogan ?? '');
  const [slug, setSlug] = useState(initial.slug ?? '');
  const [metaTitle, setMetaTitle] = useState(initial.meta_title ?? '');
  const [metaDesc, setMetaDesc] = useState(initial.meta_description ?? '');
  const [customCss, setCustomCss] = useState(initial.custom_css ?? '');

  const [social, setSocial] = useState<Record<string, string>>(
    initial.social_links && typeof initial.social_links === 'object' ? initial.social_links : {}
  );
  const [hours, setHours] = useState<Record<string, string>>(
    initial.hours && typeof initial.hours === 'object' ? initial.hours : {}
  );
  const [faq, setFaq] = useState<Array<{ q: string; a: string }>>(
    Array.isArray(initial.faq) ? initial.faq : []
  );
  const [highlights, setHighlights] = useState<string[]>(
    Array.isArray(initial.highlights) ? initial.highlights : (Array.isArray(initial.showcase) ? initial.showcase : [])
  );

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(initial.is_published ? initial.slug : null);

  const publicUrl = publishedSlug
    ? `${window.location.origin}/?page=public${kind === 'store' ? 'Store' : 'Company'}&slug=${publishedSlug}`
    : null;

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        cover_url: cover || null,
        brand_color: brandColor,
        accent_color: accentColor,
        theme_mode: themeMode,
        layout: layoutMode,
        font_family: fontFamily,
        slogan: slogan || null,
        social_links: social,
        hours,
        faq,
        highlights,
        meta_title: metaTitle || null,
        meta_description: metaDesc || null,
        custom_css: customCss || null,
      };
      if (kind === 'company') payload.showcase = highlights;

      const { error } = await supabase.from(table).update(payload).eq('id', entityId);
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error('save customizer', e);
      alert('Não foi possível guardar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    setPublishing(true);
    try {
      if (publishedSlug) {
        // Despublicar
        const fn = kind === 'store' ? 'unpublish_store' : 'unpublish_company';
        const { error } = await supabase.rpc(fn, { p_store_id: entityId, p_owner_id: ownerId } as any);
        if (error && kind === 'company') {
          const { error: e2 } = await supabase.rpc('unpublish_company' as any, { p_company_id: entityId, p_owner_id: ownerId } as any);
          if (e2) throw e2;
        }
        if (error && kind === 'store') throw error;
        setPublishedSlug(null);
      } else {
        // Publicar
        const fn = kind === 'store' ? 'publish_store' : 'publish_company';
        const paramKey = kind === 'store' ? 'p_store_id' : 'p_company_id';
        const { data, error } = await supabase.rpc(fn, {
          [paramKey]: entityId,
          p_owner_id: ownerId,
          p_slug: slug || null,
        } as any);
        if (error) throw error;
        if (data?.action === 'published' && data?.slug) {
          setPublishedSlug(data.slug);
          setSlug(data.slug);
        }
        if (data?.action === 'not_owner') alert('Só o proprietário pode publicar.');
      }
    } catch (e) {
      console.error('publish', e);
      alert('Não foi possível alterar o estado de publicação.');
    } finally {
      setPublishing(false);
    }
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copia o link público:', publicUrl);
    }
  };

  const shareNative = async () => {
    if (!publicUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: metaTitle || initial.name,
          text: slogan || `Vê ${initial.name} no IK Finance`,
          url: publicUrl,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  const openPreview = () => {
    if (!publicUrl) return;
    window.open(publicUrl, '_blank');
  };

  const addFaqItem = () => setFaq(prev => [...prev, { q: '', a: '' }]);
  const updateFaqItem = (i: number, field: 'q' | 'a', value: string) =>
    setFaq(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  const removeFaqItem = (i: number) => setFaq(prev => prev.filter((_, idx) => idx !== i));

  const addHighlight = () => setHighlights(prev => [...prev, '']);
  const updateHighlight = (i: number, value: string) =>
    setHighlights(prev => prev.map((h, idx) => idx === i ? value : h));
  const removeHighlight = (i: number) => setHighlights(prev => prev.filter((_, idx) => idx !== i));

  const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const SOCIAL_FIELDS = [
    { key: 'website', label: 'Website', placeholder: 'https://' },
    { key: 'instagram', label: 'Instagram', placeholder: '@' },
    { key: 'facebook', label: 'Facebook', placeholder: 'https://' },
    { key: 'whatsapp', label: 'WhatsApp', placeholder: '+244...' },
    { key: 'tiktok', label: 'TikTok', placeholder: '@' },
    { key: 'youtube', label: 'YouTube', placeholder: 'https://' },
    { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://' },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho: estado de publicação + ações */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${publishedSlug ? 'bg-emerald-500/20' : 'bg-gray-800'}`}>
              <Globe size={18} className={publishedSlug ? 'text-emerald-400' : 'text-gray-500'} />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">
                {publishedSlug ? `${label === 'loja' ? 'Loja' : 'Empresa'} publicada` : `A ${label} é privada`}
              </p>
              <p className="text-gray-500 text-xs">
                {publishedSlug ? `Disponível publicamente em /${publishedSlug}` : `Publica para partilhar com um link`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {publicUrl && (
              <>
                <button onClick={openPreview} className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-xl transition-colors">
                  <Eye size={14} /> Ver
                </button>
                <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-xl transition-colors">
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? 'Copiado' : 'Copiar link'}
                </button>
                <button onClick={shareNative} className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-xl transition-colors">
                  <Share2 size={14} /> Partilhar
                </button>
              </>
            )}
            <button
              onClick={togglePublish}
              disabled={publishing}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${publishedSlug ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500 hover:bg-emerald-400 text-white disabled:opacity-50'}`}
            >
              {publishing ? <Loader2 size={14} className="animate-spin" /> : publishedSlug ? <X size={14} /> : <Globe size={14} />}
              {publishedSlug ? 'Despublicar' : 'Publicar'}
            </button>
          </div>
        </div>

        {/* Campo slug quando publicado */}
        {publishedSlug && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <label className="text-xs text-gray-500 block mb-1.5">Link público (slug)</label>
            <div className="flex gap-2">
              <input
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder={`minha-${label}`}
                className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
              />
              <button onClick={save} className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs rounded-xl">
                Atualizar slug
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-1.5 flex items-center gap-1">
              <ExternalLink size={11} />
              {publicUrl}
            </p>
          </div>
        )}
      </div>

      {/* Capa */}
      <Section icon={ImageIcon} title="Capa / Banner">
        <MultiImageUpload
          bucket="brand-assets"
          folder={`${kind}-${entityId}`}
          value={cover ? [cover] : []}
          onChange={(urls) => setCover(urls[0] ?? '')}
          accept="image/*"
        />
        <p className="text-xs text-gray-500 mt-2">Aparece em grande no topo da página pública.</p>
      </Section>

      {/* Cores e tema */}
      <Section icon={Palette} title="Cores e tema">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {PRESET_COLORS.map(preset => (
            <button
              key={preset.name}
              onClick={() => { setBrandColor(preset.brand); setAccentColor(preset.accent); }}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-colors ${brandColor === preset.brand ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-700 hover:border-gray-600'}`}
            >
              <div className="flex shrink-0">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.brand }} />
                <span className="w-4 h-4 rounded-full -ml-1.5" style={{ backgroundColor: preset.accent }} />
              </div>
              <span className="text-xs text-gray-300 truncate">{preset.name}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ColorField label="Cor principal" value={brandColor} onChange={setBrandColor} />
          <ColorField label="Cor de destaque" value={accentColor} onChange={setAccentColor} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Modo</label>
            <select value={themeMode} onChange={e => setThemeMode(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500">
              {THEME_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Tipografia</label>
            <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500">
              {FONTS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
        </div>
      </Section>

      {/* Layout */}
      <Section icon={Layout} title="Layout">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {LAYOUTS.map(l => (
            <button
              key={l.id}
              onClick={() => setLayoutMode(l.id)}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-colors ${layoutMode === l.id ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-700 hover:border-gray-600'}`}
            >
              <span className="text-sm text-white font-medium">{l.label}</span>
              <span className="text-xs text-gray-500">{l.desc}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Slogan e SEO */}
      <Section icon={Sparkles} title="Identidade e SEO">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Slogan / subtítulo</label>
            <input
              value={slogan}
              onChange={e => setSlogan(e.target.value)}
              placeholder="Uma frase que descreve a tua marca"
              maxLength={140}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Título SEO (meta)</label>
            <input
              value={metaTitle}
              onChange={e => setMetaTitle(e.target.value)}
              placeholder="Título para motores de busca"
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Descrição SEO (meta)</label>
            <textarea
              value={metaDesc}
              onChange={e => setMetaDesc(e.target.value)}
              placeholder="Descrição curta para partilhas e motores de busca"
              rows={2}
              maxLength={180}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>
        </div>
      </Section>

      {/* Destaques */}
      <Section icon={Sparkles} title="Destaques / Showcase">
        <div className="space-y-2">
          {highlights.map((h, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={h}
                onChange={e => updateHighlight(i, e.target.value)}
                placeholder={`Destaque ${i + 1}`}
                className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
              />
              <button onClick={() => removeHighlight(i)} className="p-2 text-gray-500 hover:text-red-400">
                <X size={16} />
              </button>
            </div>
          ))}
          <button onClick={addHighlight} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
            <Sparkles size={12} /> Adicionar destaque
          </button>
        </div>
      </Section>

      {/* Horários */}
      <Section icon={Clock} title="Horário de funcionamento">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DAYS.map(day => (
            <div key={day} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-10 shrink-0">{day}</span>
              <input
                value={hours[day] ?? ''}
                onChange={e => setHours(prev => ({ ...prev, [day]: e.target.value }))}
                placeholder="Fechado"
                className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Redes sociais */}
      <Section icon={Globe} title="Redes sociais e contactos">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SOCIAL_FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
              <input
                value={social[f.key] ?? ''}
                onChange={e => setSocial(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section icon={HelpCircle} title="Perguntas frequentes (FAQ)">
        <div className="space-y-3">
          {faq.map((item, i) => (
            <div key={i} className="bg-gray-800/50 rounded-xl p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  value={item.q}
                  onChange={e => updateFaqItem(i, 'q', e.target.value)}
                  placeholder="Pergunta"
                  className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                />
                <button onClick={() => removeFaqItem(i)} className="p-2 text-gray-500 hover:text-red-400">
                  <X size={16} />
                </button>
              </div>
              <textarea
                value={item.a}
                onChange={e => updateFaqItem(i, 'a', e.target.value)}
                placeholder="Resposta"
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          ))}
          <button onClick={addFaqItem} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
            <HelpCircle size={12} /> Adicionar pergunta
          </button>
        </div>
      </Section>

      {/* CSS personalizado */}
      <Section icon={Sparkles} title="CSS personalizado (avançado)">
        <textarea
          value={customCss}
          onChange={e => setCustomCss(e.target.value)}
          placeholder="/* Estilos extra para a página pública */"
          rows={4}
          className="w-full bg-gray-950 border border-gray-700 text-emerald-400 text-xs font-mono rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 resize-none"
        />
        <p className="text-xs text-gray-500 mt-1.5">Aplicado apenas à tua página pública. Usa com cuidado.</p>
      </Section>

      {/* Botão guardar */}
      <div className="sticky bottom-3 z-10 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg transition-colors"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Sparkles size={16} />}
          {saving ? 'A guardar...' : saved ? 'Guardado!' : 'Guardar personalização'}
        </button>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <h3 className="flex items-center gap-2 text-white font-semibold text-sm mb-3">
        <Icon size={16} className="text-emerald-400" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1.5">{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-700 bg-transparent cursor-pointer shrink-0"
        />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-emerald-500"
        />
      </div>
    </div>
  );
}
