import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Pencil, Trash2, X, TrendingUp, TrendingDown, Home, Car,
  Music2, Briefcase, ChevronDown, MapPin, Users, Zap, BarChart2,
  DollarSign, Clock, CheckCircle, AlertCircle, ArrowUpRight,
  ArrowDownRight, Building2, Wrench, Camera,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { PatrimonioItem } from '../lib/supabase';
import { formatDate, formatPercent } from '../lib/format';
import { useCurrency } from '../context/CurrencyContext';
import { useNotifyAction } from '../lib/notify';
import ImageUpload from '../components/ImageUpload';
import { useAuth } from '../context/AuthContext';

// ── Category config ──────────────────────────────────────────────────────────
type CatId = 'imovel' | 'aluguel' | 'veiculo' | 'taxi' | 'studio' | 'investimento' | 'cripto' | 'arte' | 'equipamento' | 'outros';

const CAT_META: Record<CatId, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  imovel:      { icon: Home,      color: 'text-blue-400',    bg: 'bg-blue-950/40',    border: 'border-blue-800/50' },
  aluguel:     { icon: Building2, color: 'text-amber-400',   bg: 'bg-amber-950/40',   border: 'border-amber-800/50' },
  veiculo:     { icon: Car,       color: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-800/50' },
  taxi:        { icon: Car,       color: 'text-yellow-400',  bg: 'bg-yellow-950/40',  border: 'border-yellow-800/50' },
  studio:      { icon: Music2,    color: 'text-purple-400',  bg: 'bg-purple-950/40',  border: 'border-purple-800/50' },
  investimento:{ icon: BarChart2, color: 'text-teal-400',    bg: 'bg-teal-950/40',    border: 'border-teal-800/50' },
  cripto:      { icon: Zap,       color: 'text-orange-400',  bg: 'bg-orange-950/40',  border: 'border-orange-800/50' },
  arte:        { icon: Camera,    color: 'text-pink-400',    bg: 'bg-pink-950/40',    border: 'border-pink-800/50' },
  equipamento: { icon: Wrench,    color: 'text-gray-400',    bg: 'bg-gray-800/60',    border: 'border-gray-700' },
  outros:      { icon: Briefcase, color: 'text-gray-400',    bg: 'bg-gray-800/60',    border: 'border-gray-700' },
};
const CATEGORIAS = Object.keys(CAT_META) as CatId[];

const IMOVEL_TIPOS   = ['casa','apartamento','terreno','villa','armazém','comercial','outro'];
const VEICULO_TIPOS  = ['carro','moto','camião','pickup','van','barco','outro'];
const COMBUSTIVEIS   = ['gasolina','diesel','elétrico','híbrido','gás','outro'];
const STUDIO_TIPOS   = ['gravação','fotografia','podcast','dança','cinema','co-working','outro'];

// ── Form state ────────────────────────────────────────────────────────────────
type Form = {
  nome: string; categoria: CatId; valor_aquisicao: string; valor_atual: string;
  data_aquisicao: string; descricao: string; localizacao: string; imagem_url: string | null;
  status: string;
  // Imóvel / Aluguel
  imovel_tipo: string; imovel_area_m2: string; imovel_quartos: string;
  imovel_arrendado: boolean; renda_mensal: string; despesa_mensal: string;
  inquilino_nome: string; contrato_inicio: string; contrato_fim: string;
  // Veículo
  veiculo_tipo: string; veiculo_marca: string; veiculo_modelo: string;
  veiculo_ano: string; veiculo_matricula: string; veiculo_km: string;
  veiculo_combustivel: string; veiculo_gera_renda: boolean; veiculo_renda_diaria: string;
  // Estúdio
  studio_tipo: string; studio_capacidade: string; studio_equipamentos: string;
  studio_disponivel: boolean; studio_preco_hora: string;
};

const emptyForm = (): Form => ({
  nome: '', categoria: 'imovel', valor_aquisicao: '0', valor_atual: '0',
  data_aquisicao: '', descricao: '', localizacao: '', imagem_url: null, status: 'ativo',
  imovel_tipo: 'casa', imovel_area_m2: '', imovel_quartos: '',
  imovel_arrendado: false, renda_mensal: '', despesa_mensal: '',
  inquilino_nome: '', contrato_inicio: '', contrato_fim: '',
  veiculo_tipo: 'carro', veiculo_marca: '', veiculo_modelo: '',
  veiculo_ano: '', veiculo_matricula: '', veiculo_km: '',
  veiculo_combustivel: 'gasolina', veiculo_gera_renda: false, veiculo_renda_diaria: '',
  studio_tipo: 'gravação', studio_capacidade: '', studio_equipamentos: '',
  studio_disponivel: true, studio_preco_hora: '',
});

function itemToForm(item: PatrimonioItem): Form {
  return {
    nome: item.nome, categoria: item.categoria as CatId,
    valor_aquisicao: String(item.valor_aquisicao), valor_atual: String(item.valor_atual),
    data_aquisicao: item.data_aquisicao ?? '', descricao: item.descricao ?? '',
    localizacao: item.localizacao ?? '', imagem_url: item.imagem_url,
    status: item.status ?? 'ativo',
    imovel_tipo: item.imovel_tipo ?? 'casa', imovel_area_m2: item.imovel_area_m2 ? String(item.imovel_area_m2) : '',
    imovel_quartos: item.imovel_quartos ? String(item.imovel_quartos) : '',
    imovel_arrendado: item.imovel_arrendado ?? false,
    renda_mensal: item.renda_mensal ? String(item.renda_mensal) : '',
    despesa_mensal: item.despesa_mensal ? String(item.despesa_mensal) : '',
    inquilino_nome: item.inquilino_nome ?? '', contrato_inicio: item.contrato_inicio ?? '',
    contrato_fim: item.contrato_fim ?? '',
    veiculo_tipo: item.veiculo_tipo ?? 'carro', veiculo_marca: item.veiculo_marca ?? '',
    veiculo_modelo: item.veiculo_modelo ?? '', veiculo_ano: item.veiculo_ano ? String(item.veiculo_ano) : '',
    veiculo_matricula: item.veiculo_matricula ?? '', veiculo_km: item.veiculo_km ? String(item.veiculo_km) : '',
    veiculo_combustivel: item.veiculo_combustivel ?? 'gasolina',
    veiculo_gera_renda: item.veiculo_gera_renda ?? false,
    veiculo_renda_diaria: item.veiculo_renda_diaria ? String(item.veiculo_renda_diaria) : '',
    studio_tipo: item.studio_tipo ?? 'gravação', studio_capacidade: item.studio_capacidade ? String(item.studio_capacidade) : '',
    studio_equipamentos: item.studio_equipamentos ?? '',
    studio_disponivel: item.studio_disponivel ?? true,
    studio_preco_hora: item.studio_preco_hora ? String(item.studio_preco_hora) : '',
  };
}

function formToPayload(f: Form) {
  const base = {
    nome: f.nome.trim(), categoria: f.categoria,
    valor_aquisicao: parseFloat(f.valor_aquisicao) || 0,
    valor_atual: parseFloat(f.valor_atual) || 0,
    data_aquisicao: f.data_aquisicao || null,
    descricao: f.descricao || null, localizacao: f.localizacao || null,
    imagem_url: f.imagem_url, status: f.status,
  };
  const isImovel = f.categoria === 'imovel' || f.categoria === 'aluguel';
  const isVeiculo = f.categoria === 'veiculo' || f.categoria === 'taxi';
  const isStudio = f.categoria === 'studio';
  return {
    ...base,
    imovel_tipo:      isImovel ? f.imovel_tipo : null,
    imovel_area_m2:   isImovel && f.imovel_area_m2 ? parseFloat(f.imovel_area_m2) : null,
    imovel_quartos:   isImovel && f.imovel_quartos ? parseInt(f.imovel_quartos) : null,
    imovel_arrendado: isImovel ? f.imovel_arrendado : false,
    renda_mensal:     isImovel && f.renda_mensal ? parseFloat(f.renda_mensal) : null,
    despesa_mensal:   isImovel && f.despesa_mensal ? parseFloat(f.despesa_mensal) : null,
    inquilino_nome:   isImovel ? f.inquilino_nome || null : null,
    contrato_inicio:  isImovel ? f.contrato_inicio || null : null,
    contrato_fim:     isImovel ? f.contrato_fim || null : null,
    veiculo_tipo:         isVeiculo ? f.veiculo_tipo : null,
    veiculo_marca:        isVeiculo ? f.veiculo_marca || null : null,
    veiculo_modelo:       isVeiculo ? f.veiculo_modelo || null : null,
    veiculo_ano:          isVeiculo && f.veiculo_ano ? parseInt(f.veiculo_ano) : null,
    veiculo_matricula:    isVeiculo ? f.veiculo_matricula || null : null,
    veiculo_km:           isVeiculo && f.veiculo_km ? parseInt(f.veiculo_km) : null,
    veiculo_combustivel:  isVeiculo ? f.veiculo_combustivel : null,
    veiculo_gera_renda:   isVeiculo ? f.veiculo_gera_renda : false,
    veiculo_renda_diaria: isVeiculo && f.veiculo_renda_diaria ? parseFloat(f.veiculo_renda_diaria) : null,
    studio_tipo:          isStudio ? f.studio_tipo : null,
    studio_capacidade:    isStudio && f.studio_capacidade ? parseInt(f.studio_capacidade) : null,
    studio_equipamentos:  isStudio ? f.studio_equipamentos || null : null,
    studio_disponivel:    isStudio ? f.studio_disponivel : true,
    studio_preco_hora:    isStudio && f.studio_preco_hora ? parseFloat(f.studio_preco_hora) : null,
  };
}

// ── Sub-label helper ──────────────────────────────────────────────────────────
function itemSubLabel(item: PatrimonioItem): string {
  const cat = item.categoria as CatId;
  if (cat === 'imovel' || cat === 'aluguel') {
    const parts = [item.imovel_tipo, item.imovel_area_m2 ? `${item.imovel_area_m2}m²` : null, item.imovel_quartos ? `${item.imovel_quartos} qts` : null];
    return parts.filter(Boolean).join(' · ');
  }
  if (cat === 'veiculo' || cat === 'taxi') {
    const parts = [item.veiculo_marca, item.veiculo_modelo, item.veiculo_ano ? String(item.veiculo_ano) : null];
    return parts.filter(Boolean).join(' ');
  }
  if (cat === 'studio') {
    const parts = [item.studio_tipo, item.studio_capacidade ? `${item.studio_capacidade} pessoas` : null];
    return parts.filter(Boolean).join(' · ');
  }
  return '';
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${color}`}>{children}</span>;
}

// ── Asset Card ────────────────────────────────────────────────────────────────
function AssetCard({ item, onEdit, onRemove, format }: {
  item: PatrimonioItem; onEdit: () => void; onRemove: () => void; format: (v: number) => string;
}) {
  const { t } = useTranslation();
  const cat = (item.categoria as CatId) in CAT_META ? item.categoria as CatId : 'outros';
  const meta = CAT_META[cat];
  const Icon = meta.icon;
  const variacao = item.valor_aquisicao > 0 ? ((item.valor_atual - item.valor_aquisicao) / item.valor_aquisicao) * 100 : 0;
  const subLabel = itemSubLabel(item);
  const isImovel = cat === 'imovel' || cat === 'aluguel';
  const isVeiculo = cat === 'veiculo' || cat === 'taxi';
  const isStudio = cat === 'studio';
  const lucroMensal = isImovel && item.renda_mensal ? item.renda_mensal - (item.despesa_mensal ?? 0) : null;

  return (
    <div className={`relative bg-gray-900 border rounded-2xl overflow-hidden group hover:border-gray-700 transition-all duration-200 ${meta.border}`}>
      {/* Header with image or gradient */}
      <div className={`h-28 relative overflow-hidden ${meta.bg}`}>
        {item.imagem_url ? (
          <img src={item.imagem_url} alt={item.nome} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon size={40} className={`${meta.color} opacity-20`} />
          </div>
        )}
        {/* Badges overlay */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          <Badge color={`${meta.color} ${meta.bg} border-current`}>
            <Icon size={9} /> {t(`patrimonio.cats.${cat}`)}
          </Badge>
          {item.status !== 'ativo' && (
            <Badge color="text-gray-400 bg-gray-800/80 border-gray-700">{item.status}</Badge>
          )}
          {isImovel && item.imovel_arrendado && (
            <Badge color="text-emerald-400 bg-emerald-950/80 border-emerald-700">{t('patrimonio.arrendado')}</Badge>
          )}
          {isVeiculo && item.veiculo_gera_renda && (
            <Badge color="text-yellow-400 bg-yellow-950/80 border-yellow-700">{t('patrimonio.geraRenda')}</Badge>
          )}
          {isStudio && (
            <Badge color={item.studio_disponivel ? 'text-emerald-400 bg-emerald-950/80 border-emerald-700' : 'text-red-400 bg-red-950/80 border-red-700'}>
              {item.studio_disponivel ? t('patrimonio.disponivel') : t('patrimonio.ocupado')}
            </Badge>
          )}
        </div>
        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 bg-gray-900/90 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors">
            <Pencil size={12} />
          </button>
          <button onClick={onRemove} className="p-1.5 bg-gray-900/90 hover:bg-red-950 border border-gray-700 hover:border-red-800 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-white font-semibold text-sm truncate">{item.nome}</h3>
          {subLabel && <p className="text-gray-500 text-xs mt-0.5 capitalize">{subLabel}</p>}
          {item.localizacao && (
            <p className="text-gray-600 text-xs mt-0.5 flex items-center gap-1"><MapPin size={9} />{item.localizacao}</p>
          )}
        </div>

        {/* Values */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-800/60 rounded-xl p-2.5">
            <p className="text-gray-600 text-[10px] mb-0.5">{t('patrimonio.valorAquisicaoShort')}</p>
            <p className="text-gray-300 text-xs font-semibold">{format(item.valor_aquisicao)}</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl p-2.5">
            <p className="text-gray-600 text-[10px] mb-0.5">{t('patrimonio.valorAtualShort')}</p>
            <p className="text-white text-xs font-bold">{format(item.valor_atual)}</p>
          </div>
        </div>

        {/* Variação */}
        <div className={`flex items-center justify-between px-2.5 py-2 rounded-xl ${variacao >= 0 ? 'bg-emerald-950/40 border border-emerald-900/50' : 'bg-red-950/40 border border-red-900/50'}`}>
          <span className="text-gray-500 text-[10px]">{t('patrimonio.valorizacao')}</span>
          <span className={`flex items-center gap-1 text-xs font-bold ${variacao >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {variacao >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {formatPercent(variacao)}
          </span>
        </div>

        {/* Category-specific stats */}
        {isImovel && (
          <div className="mt-3 space-y-1.5">
            {item.renda_mensal ? (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 flex items-center gap-1"><DollarSign size={10} />{t('patrimonio.rendaMensal')}</span>
                <span className="text-emerald-400 font-semibold">{format(item.renda_mensal)}</span>
              </div>
            ) : null}
            {item.despesa_mensal ? (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">{t('patrimonio.despesaMensal')}</span>
                <span className="text-red-400 font-semibold">{format(item.despesa_mensal)}</span>
              </div>
            ) : null}
            {lucroMensal !== null && (
              <div className={`flex justify-between text-xs font-bold border-t border-gray-800 pt-1.5 mt-1`}>
                <span className="text-gray-400">{t('patrimonio.lucroLiquidoMes')}</span>
                <span className={lucroMensal >= 0 ? 'text-emerald-400' : 'text-red-400'}>{format(lucroMensal)}</span>
              </div>
            )}
            {item.inquilino_nome && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-1">
                <Users size={10} />{item.inquilino_nome}
              </div>
            )}
            {item.contrato_fim && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Clock size={10} />Contrato até {formatDate(item.contrato_fim)}
              </div>
            )}
          </div>
        )}

        {isVeiculo && (
          <div className="mt-3 space-y-1.5">
            {item.veiculo_matricula && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">{t('patrimonio.matricula')}</span>
                <span className="text-gray-300 font-mono">{item.veiculo_matricula}</span>
              </div>
            )}
            {item.veiculo_km ? (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">{t('patrimonio.km')}</span>
                <span className="text-gray-300">{Number(item.veiculo_km).toLocaleString()} km</span>
              </div>
            ) : null}
            {item.veiculo_gera_renda && item.veiculo_renda_diaria ? (
              <div className="flex justify-between text-xs font-bold border-t border-gray-800 pt-1.5">
                <span className="text-gray-400 flex items-center gap-1"><DollarSign size={10} />{t('patrimonio.rendaDiaria')}</span>
                <span className="text-yellow-400">{format(item.veiculo_renda_diaria)}</span>
              </div>
            ) : null}
          </div>
        )}

        {isStudio && (
          <div className="mt-3 space-y-1.5">
            {item.studio_capacidade ? (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 flex items-center gap-1"><Users size={10} />{t('patrimonio.capacidade')}</span>
                <span className="text-gray-300">{item.studio_capacidade} pessoas</span>
              </div>
            ) : null}
            {item.studio_preco_hora ? (
              <div className="flex justify-between text-xs font-bold border-t border-gray-800 pt-1.5">
                <span className="text-gray-400 flex items-center gap-1"><DollarSign size={10} />{t('patrimonio.precoHora')}</span>
                <span className="text-purple-400">{format(item.studio_preco_hora)}</span>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Input helpers ─────────────────────────────────────────────────────────────
const inputCls = 'w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder-gray-600';
const labelCls = 'block text-xs text-gray-500 mb-1.5';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className={labelCls}>{label}</label>{children}</div>;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Patrimonio() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [items, setItems]       = useState<PatrimonioItem[]>([]);
  const { format }              = useCurrency();
  const notify                  = useNotifyAction();
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState<PatrimonioItem | null>(null);
  const [form, setForm]         = useState<Form>(emptyForm());
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<'todos' | CatId>('todos');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const sf = (patch: Partial<Form>) => setForm(f => ({ ...f, ...patch }));

  const loadItems = async () => {
    const { data, error } = await supabase.from('patrimonio').select('*').order('created_at', { ascending: false });
    if (!error) setItems((data ?? []) as PatrimonioItem[]);
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
    const ch = supabase.channel('patrimonio-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'patrimonio' }, loadItems).subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm()); setError(null); setShowModal(true); };
  const openEdit = (item: PatrimonioItem) => { setEditing(item); setForm(itemToForm(item)); setError(null); setShowModal(true); };

  const save = async () => {
    setError(null);
    if (!form.nome.trim()) { setError(t('patrimonio.nomeObrigatorio')); return; }
    setSaving(true);
    const payload = formToPayload(form);
    const q = editing
      ? supabase.from('patrimonio').update(payload).eq('id', editing.id)
      : supabase.from('patrimonio').insert(payload);
    const { error: err } = await q;
    if (err) { setError(err.message); setSaving(false); return; }
    await loadItems();
    setShowModal(false);
    setSaving(false);
    await notify('patrimonio', editing ? 'Ativo atualizado' : 'Novo ativo registrado', payload.nome);
  };

  const remove = async (id: string) => {
    if (!confirm(t('patrimonio.confirmarExcluir'))) return;
    const item = items.find(i => i.id === id);
    await supabase.from('patrimonio').delete().eq('id', id);
    await loadItems();
    if (item) await notify('patrimonio', 'Ativo excluído', `${item.nome} foi removido do patrimônio`);
  };

  const visible = filterCat === 'todos' ? items : items.filter(i => i.categoria === filterCat);
  const totalAquisicao = items.reduce((s, i) => s + i.valor_aquisicao, 0);
  const totalAtual     = items.reduce((s, i) => s + i.valor_atual, 0);
  const variacaoTotal  = totalAquisicao > 0 ? ((totalAtual - totalAquisicao) / totalAquisicao) * 100 : 0;
  const rendaMensalTotal = items.reduce((s, i) => s + (i.renda_mensal ?? 0) + (i.veiculo_renda_diaria ? i.veiculo_renda_diaria * 30 : 0), 0);

  const isImovel = form.categoria === 'imovel' || form.categoria === 'aluguel';
  const isVeiculo = form.categoria === 'veiculo' || form.categoria === 'taxi';
  const isStudio = form.categoria === 'studio';

  const usedCats = Array.from(new Set(items.map(i => i.categoria as CatId)));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('patrimonio.title')}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{t('patrimonio.subtitle')}</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={16} /> {t('patrimonio.novoAtivo')}
        </button>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-500 text-xs mb-1">{t('patrimonio.valorAquisicao')}</p>
          <p className="text-lg font-bold text-white">{format(totalAquisicao)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-500 text-xs mb-1">{t('patrimonio.valorAtual')}</p>
          <p className="text-lg font-bold text-white">{format(totalAtual)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-500 text-xs mb-1">{t('patrimonio.valorizacaoTotal')}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {variacaoTotal >= 0
              ? <TrendingUp size={14} className="text-emerald-400" />
              : <TrendingDown size={14} className="text-red-400" />}
            <p className={`text-lg font-bold ${variacaoTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatPercent(variacaoTotal)}</p>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-500 text-xs mb-1">{t('patrimonio.rendaPassiva')}</p>
          <p className="text-lg font-bold text-amber-400">{format(rendaMensalTotal)}</p>
          <p className="text-gray-600 text-[10px] mt-0.5">{t('patrimonio.aluguelTransporte')}</p>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCat('todos')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${filterCat === 'todos' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'}`}>
          {t('patrimonio.todos')} ({items.length})
        </button>
        {usedCats.map(cat => {
          const meta = CAT_META[cat] ?? CAT_META.outros;
          const Icon = meta.icon;
          const count = items.filter(i => i.categoria === cat).length;
          return (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${filterCat === cat ? `${meta.bg} ${meta.border} ${meta.color}` : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'}`}>
              <Icon size={11} /> {t(`patrimonio.cats.${cat}`)} ({count})
            </button>
          );
        })}
      </div>

      {/* Cards grid */}
      {visible.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-2xl">
          <Briefcase size={36} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">{t('patrimonio.nenhumAtivo')}</p>
          <p className="text-gray-600 text-sm mt-1">{t('patrimonio.adicionarDesc')}</p>
          <button onClick={openNew}
            className="mt-5 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
            <Plus size={15} /> {t('patrimonio.adicionarAtivo')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map(item => (
            <AssetCard key={item.id} item={item} format={format}
              onEdit={() => openEdit(item)} onRemove={() => remove(item.id)} />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-white font-semibold">{editing ? t('patrimonio.editarAtivo') : t('patrimonio.novoAtivo')}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-300 p-1"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Category selector */}
              <div>
                <label className={labelCls}>{t('patrimonio.tipoAtivo')}</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {CATEGORIAS.map(cat => {
                    const meta = CAT_META[cat];
                    const Icon = meta.icon;
                    return (
                      <button key={cat} type="button"
                        onClick={() => sf({ categoria: cat })}
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${form.categoria === cat ? `${meta.bg} ${meta.border} ${meta.color}` : 'bg-gray-800/40 border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300'}`}>
                        <Icon size={16} />
                        <span className="leading-tight text-center">{t(`patrimonio.cats.${cat}`)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Image */}
              <div>
                <label className={labelCls}>{t('patrimonio.fotoAtivo')}</label>
                <ImageUpload
                  bucket="store-assets"
                  path={`${user?.id}/patrimonio/${editing?.id ?? 'new'}`}
                  currentUrl={form.imagem_url}
                  onUploaded={url => sf({ imagem_url: url })}
                  shape="square" size="md" placeholder="Foto"
                />
              </div>

              {/* Base fields */}
              <Field label={t('patrimonio.nome')}>
                <input value={form.nome} onChange={e => sf({ nome: e.target.value })}
                  className={inputCls} placeholder={isImovel ? 'Ex: Casa em Miramar' : isVeiculo ? 'Ex: Toyota Hilux 2020' : isStudio ? 'Ex: Estúdio K1' : 'Nome do ativo'} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t('patrimonio.aquisicao')}>
                  <input type="number" value={form.valor_aquisicao} onChange={e => sf({ valor_aquisicao: e.target.value })} className={inputCls} min="0" />
                </Field>
                <Field label={t('patrimonio.atual')}>
                  <input type="number" value={form.valor_atual} onChange={e => sf({ valor_atual: e.target.value })} className={inputCls} min="0" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t('patrimonio.dataAquisicao')}>
                  <input type="date" value={form.data_aquisicao} onChange={e => sf({ data_aquisicao: e.target.value })} className={inputCls} />
                </Field>
                <Field label={t('patrimonio.status')}>
                  <select value={form.status} onChange={e => sf({ status: e.target.value })} className={inputCls}>
                    {['ativo','inativo','vendido','arrendado','em manutenção'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              <Field label={t('patrimonio.localizacao')}>
                <input value={form.localizacao} onChange={e => sf({ localizacao: e.target.value })}
                  className={inputCls} placeholder={t('patrimonio.localizacaoPlaceholder')} />
              </Field>

              {/* ── IMÓVEL / ALUGUEL fields ── */}
              {isImovel && (
                <div className="space-y-3 pt-2 border-t border-gray-800">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-2"><Home size={12} /> {t('patrimonio.detalhesImovel')}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label={t('patrimonio.imovelTipo')}>
                      <select value={form.imovel_tipo} onChange={e => sf({ imovel_tipo: e.target.value })} className={inputCls}>
                        {IMOVEL_TIPOS.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                      </select>
                    </Field>
                    <Field label={t('patrimonio.areaM2')}>
                      <input type="number" value={form.imovel_area_m2} onChange={e => sf({ imovel_area_m2: e.target.value })} className={inputCls} placeholder="120" />
                    </Field>
                    <Field label={t('patrimonio.quartos')}>
                      <input type="number" value={form.imovel_quartos} onChange={e => sf({ imovel_quartos: e.target.value })} className={inputCls} placeholder="3" min="0" />
                    </Field>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div onClick={() => sf({ imovel_arrendado: !form.imovel_arrendado })}
                        className={`w-9 h-5 rounded-full transition-colors relative ${form.imovel_arrendado ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.imovel_arrendado ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                      <span className="text-sm text-gray-300">{t('patrimonio.arrendado')}</span>
                    </label>
                  </div>

                  {form.imovel_arrendado && (
                    <div className="space-y-3 p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl">
                      <p className="text-xs text-emerald-400 font-semibold">{t('patrimonio.dadosArrendamento')}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label={t('patrimonio.rendaMensal')}>
                          <input type="number" value={form.renda_mensal} onChange={e => sf({ renda_mensal: e.target.value })} className={inputCls} placeholder="0" />
                        </Field>
                        <Field label={t('patrimonio.despesaMensal')}>
                          <input type="number" value={form.despesa_mensal} onChange={e => sf({ despesa_mensal: e.target.value })} className={inputCls} placeholder="0" />
                        </Field>
                      </div>
                      <Field label={t('patrimonio.inquilinoNome')}>
                        <input value={form.inquilino_nome} onChange={e => sf({ inquilino_nome: e.target.value })} className={inputCls} placeholder="Nome completo" />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label={t('patrimonio.contratoInicio')}>
                          <input type="date" value={form.contrato_inicio} onChange={e => sf({ contrato_inicio: e.target.value })} className={inputCls} />
                        </Field>
                        <Field label={t('patrimonio.contratoFim')}>
                          <input type="date" value={form.contrato_fim} onChange={e => sf({ contrato_fim: e.target.value })} className={inputCls} />
                        </Field>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── VEÍCULO / TÁXI fields ── */}
              {isVeiculo && (
                <div className="space-y-3 pt-2 border-t border-gray-800">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-2"><Car size={12} /> {t('patrimonio.detalhesVeiculo')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t('patrimonio.veiculoTipo')}>
                      <select value={form.veiculo_tipo} onChange={e => sf({ veiculo_tipo: e.target.value })} className={inputCls}>
                        {VEICULO_TIPOS.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                      </select>
                    </Field>
                    <Field label={t('patrimonio.combustivel')}>
                      <select value={form.veiculo_combustivel} onChange={e => sf({ veiculo_combustivel: e.target.value })} className={inputCls}>
                        {COMBUSTIVEIS.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t('patrimonio.marca')}>
                      <input value={form.veiculo_marca} onChange={e => sf({ veiculo_marca: e.target.value })} className={inputCls} placeholder="Toyota, Hyundai…" />
                    </Field>
                    <Field label={t('patrimonio.modelo')}>
                      <input value={form.veiculo_modelo} onChange={e => sf({ veiculo_modelo: e.target.value })} className={inputCls} placeholder="Hilux, Tucson…" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label={t('patrimonio.ano')}>
                      <input type="number" value={form.veiculo_ano} onChange={e => sf({ veiculo_ano: e.target.value })} className={inputCls} placeholder="2020" />
                    </Field>
                    <Field label={t('patrimonio.matricula')}>
                      <input value={form.veiculo_matricula} onChange={e => sf({ veiculo_matricula: e.target.value })} className={inputCls} placeholder="LD-00-00-AO" />
                    </Field>
                    <Field label={t('patrimonio.km')}>
                      <input type="number" value={form.veiculo_km} onChange={e => sf({ veiculo_km: e.target.value })} className={inputCls} placeholder="45000" />
                    </Field>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div onClick={() => sf({ veiculo_gera_renda: !form.veiculo_gera_renda })}
                        className={`w-9 h-5 rounded-full transition-colors relative ${form.veiculo_gera_renda ? 'bg-yellow-500' : 'bg-gray-700'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.veiculo_gera_renda ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                      <span className="text-sm text-gray-300">{t('patrimonio.geraRenda')}</span>
                    </label>
                  </div>

                  {form.veiculo_gera_renda && (
                    <div className="p-4 bg-yellow-950/20 border border-yellow-900/40 rounded-xl">
                      <Field label={t('patrimonio.rendaDiaria')}>
                        <input type="number" value={form.veiculo_renda_diaria} onChange={e => sf({ veiculo_renda_diaria: e.target.value })} className={inputCls} placeholder="0" />
                      </Field>
                    </div>
                  )}
                </div>
              )}

              {/* ── ESTÚDIO fields ── */}
              {isStudio && (
                <div className="space-y-3 pt-2 border-t border-gray-800">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-2"><Music2 size={12} /> {t('patrimonio.detalhesStudio')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t('patrimonio.studioTipo')}>
                      <select value={form.studio_tipo} onChange={e => sf({ studio_tipo: e.target.value })} className={inputCls}>
                        {STUDIO_TIPOS.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                      </select>
                    </Field>
                    <Field label={t('patrimonio.capacidade')}>
                      <input type="number" value={form.studio_capacidade} onChange={e => sf({ studio_capacidade: e.target.value })} className={inputCls} placeholder="10" min="0" />
                    </Field>
                  </div>
                  <Field label={t('patrimonio.precoHora')}>
                    <input type="number" value={form.studio_preco_hora} onChange={e => sf({ studio_preco_hora: e.target.value })} className={inputCls} placeholder="0" />
                  </Field>
                  <Field label={t('patrimonio.equipamentos')}>
                    <textarea value={form.studio_equipamentos} onChange={e => sf({ studio_equipamentos: e.target.value })} rows={2}
                      className={`${inputCls} resize-none`} placeholder={t('patrimonio.equipamentosPlaceholder')} />
                  </Field>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div onClick={() => sf({ studio_disponivel: !form.studio_disponivel })}
                        className={`w-9 h-5 rounded-full transition-colors relative ${form.studio_disponivel ? 'bg-emerald-500' : 'bg-red-600'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.studio_disponivel ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                      <span className="text-sm text-gray-300">{form.studio_disponivel ? t('patrimonio.disponivel') : t('patrimonio.ocupado')}</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Descrição */}
              <Field label={t('patrimonio.notasAdicionais')}>
                <textarea value={form.descricao} onChange={e => sf({ descricao: e.target.value })} rows={2}
                  className={`${inputCls} resize-none`} placeholder={t('patrimonio.notasPlaceholder')} />
              </Field>

              {error && (
                <p className="text-red-400 text-sm flex items-center gap-1.5"><AlertCircle size={13} />{error}</p>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 px-6 py-4 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-700 text-gray-300 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors">
                {t('patrimonio.cancelar')}
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                {saving ? t('patrimonio.salvando') : editing ? t('patrimonio.salvarAlteracoes') : t('patrimonio.adicionarAtivo')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
