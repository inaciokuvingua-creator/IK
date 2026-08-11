import { useCallback, useEffect, useState } from 'react';
import {
  Sparkles, Save, RefreshCw, Check, AlertTriangle,
  BarChart3, Users, Zap, MessageSquare, Settings2
} from 'lucide-react';
import {
  adminApi,
  type SystemSetting,
  type AIKnowledgeItem,
  type AIFeedbackItem,
  type AILearningQueueItem,
} from '../api';

const AI_KEYS = [
  'ai_enabled', 'ai_name', 'ai_persona', 'ai_model',
  'ai_max_tokens', 'ai_daily_limit', 'ai_premium_limit',
];

const AI_META: Record<string, { label: string; desc: string; type: 'text' | 'toggle' | 'number' | 'textarea' | 'select'; options?: string[] }> = {
  ai_enabled:       { label: 'IA Ativa', desc: 'Liga/desliga o assistente para todos os utilizadores', type: 'toggle' },
  ai_name:          { label: 'Nome do Assistente', desc: 'Nome exibido na interface (ex: IK Finance AI)', type: 'text' },
  ai_persona:       { label: 'Persona / Instruções do Sistema', desc: 'Texto de sistema que define o comportamento e identidade da IA', type: 'textarea' },
  ai_model:         { label: 'Modelo de IA', desc: 'Modelo OpenAI a utilizar', type: 'select', options: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-4-turbo'] },
  ai_max_tokens:    { label: 'Máx. Tokens por Resposta', desc: 'Limite de tokens por resposta da IA', type: 'number' },
  ai_daily_limit:   { label: 'Limite Diário (Plano Free)', desc: 'Nº máximo de mensagens/dia para utilizadores gratuitos', type: 'number' },
  ai_premium_limit: { label: 'Limite Diário (Premium+)', desc: 'Nº máximo de mensagens/dia para utilizadores premium', type: 'number' },
};

type UsageStats = { total: number; today: number; byContext: Record<string, number> };

export default function AdminAI() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [knowledge, setKnowledge] = useState<AIKnowledgeItem[]>([]);
  const [feedback, setFeedback] = useState<AIFeedbackItem[]>([]);
  const [queue, setQueue] = useState<AILearningQueueItem[]>([]);

  const showToast = useCallback((ok: boolean, msg: string) => { setToast({ ok, msg }); setTimeout(() => setToast(null), 3000); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await adminApi.settings();
      const ai = all.filter(s => AI_KEYS.includes(s.chave));
      setSettings(ai);
      const v: Record<string, string> = {};
      ai.forEach(s => { v[s.chave] = s.valor; });
      setValues(v);

      // Load usage stats via logs (approximate)
      const logsRes = await adminApi.logs(1);
      const aiLogs = logsRes.logs.filter(l => l.entidade === 'ai_usage_log' || l.acao.startsWith('ai_'));
      setUsage({ total: logsRes.total, today: aiLogs.length, byContext: {} });

      const [knowledgeRes, feedbackRes, queueRes] = await Promise.all([
        adminApi.aiKnowledge(1),
        adminApi.aiFeedback(1),
        adminApi.aiLearningQueue(1),
      ]);

      setKnowledge(knowledgeRes.items ?? []);
      setFeedback(feedbackRes.items ?? []);
      setQueue(queueRes.items ?? []);
    } catch (e) { showToast(false, (e as Error).message); }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const updates = AI_KEYS.filter(k => k in values).map(k => ({ chave: k, valor: values[k] }));
      await adminApi.saveSettings(updates);
      showToast(true, 'Configurações da IA salvas');
    } catch (e) { showToast(false, (e as Error).message); }
    setSaving(false);
  };

  const updateQueueStatus = async (id: string, status: string) => {
    try {
      await adminApi.aiLearningQueueUpdate(id, { status });
      showToast(true, 'Fila de aprendizado atualizada');
      const queueRes = await adminApi.aiLearningQueue(1);
      setQueue(queueRes.items ?? []);
    } catch (e) {
      showToast(false, (e as Error).message);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles size={22} className="text-emerald-400" /> IK Finance AI
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Configure o assistente inteligente da plataforma</p>
        </div>
        <button onClick={load} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {toast && (
        <div className={`flex items-center gap-2 p-3.5 rounded-xl border text-sm ${toast.ok ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-red-950/50 border-red-800 text-red-300'}`}>
          {toast.ok ? <Check size={15} /> : <AlertTriangle size={15} />} {toast.msg}
        </div>
      )}

      {/* Status card */}
      <div className={`border rounded-2xl p-5 flex items-center gap-4 ${values.ai_enabled === 'true' ? 'bg-emerald-950/30 border-emerald-800/50' : 'bg-gray-900 border-gray-800'}`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${values.ai_enabled === 'true' ? 'bg-emerald-500/20' : 'bg-gray-800'}`}>
          <Sparkles size={22} className={values.ai_enabled === 'true' ? 'text-emerald-400' : 'text-gray-600'} />
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold">{values.ai_name ?? 'IK Finance AI'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`w-2 h-2 rounded-full ${values.ai_enabled === 'true' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
            <p className={`text-xs font-medium ${values.ai_enabled === 'true' ? 'text-emerald-400' : 'text-gray-500'}`}>
              {values.ai_enabled === 'true' ? 'Ativo e a responder' : 'Desativado'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setValues({ ...values, ai_enabled: values.ai_enabled === 'true' ? 'false' : 'true' })}
          className={`relative w-12 h-6 rounded-full transition-colors ${values.ai_enabled === 'true' ? 'bg-emerald-500' : 'bg-gray-700'}`}
        >
          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${values.ai_enabled === 'true' ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Settings form */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold text-white text-sm flex items-center gap-2">
          <Settings2 size={15} className="text-red-400" /> Configurações
        </h2>

        {loading ? (
          <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse" />)}</div>
        ) : (
          AI_KEYS.filter(k => k !== 'ai_enabled').map(key => {
            const meta = AI_META[key];
            if (!meta) return null;
            return (
              <div key={key}>
                <label className="block text-white text-sm font-medium mb-0.5">{meta.label}</label>
                <p className="text-gray-500 text-xs mb-1.5">{meta.desc}</p>

                {meta.type === 'textarea' ? (
                  <textarea value={values[key] ?? ''} onChange={e => setValues({ ...values, [key]: e.target.value })} rows={4}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors resize-none" />
                ) : meta.type === 'select' ? (
                  <select value={values[key] ?? ''} onChange={e => setValues({ ...values, [key]: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors">
                    {meta.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={meta.type} value={values[key] ?? ''} onChange={e => setValues({ ...values, [key]: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors" />
                )}
              </div>
            );
          })
        )}

        <button onClick={save} disabled={saving || loading}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
          <Save size={15} /> {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>

      {/* Limits info */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Modelo ativo', value: values.ai_model ?? '—', icon: Zap, color: 'text-blue-400' },
          { label: 'Limite free/dia', value: values.ai_daily_limit ?? '—', icon: Users, color: 'text-amber-400' },
          { label: 'Limite premium/dia', value: values.ai_premium_limit ?? '—', icon: MessageSquare, color: 'text-emerald-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <Icon size={16} className={`${color} mx-auto mb-2`} />
            <p className="text-white font-bold text-lg">{value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* API key note */}
      <div className="bg-amber-950/30 border border-amber-800/40 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-sm font-semibold mb-1">Chave de API OpenAI</p>
            <p className="text-amber-300/70 text-xs leading-relaxed">
              Para respostas inteligentes em tempo real, configure a variável de ambiente <code className="bg-amber-950/60 px-1.5 py-0.5 rounded text-amber-200 font-mono">OPENAI_API_KEY</code> nos secrets da edge function. Sem a chave, o assistente funciona com respostas inteligentes pré-definidas sobre a plataforma IK Finance.
            </p>
          </div>
        </div>
      </div>

      {/* Knowledge center */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white text-sm font-semibold flex items-center gap-2"><BarChart3 size={14} className="text-emerald-400" /> Conhecimento</h3>
            <span className="text-xs text-gray-500">{knowledge.length} itens</span>
          </div>
          <div className="space-y-2 max-h-72 overflow-auto pr-1">
            {knowledge.map((item) => (
              <div key={item.id} className="border border-gray-800 rounded-xl p-3 bg-gray-900/60">
                <p className="text-white text-sm font-medium">{item.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{item.category} · v{item.version} · {item.status}</p>
                <p className="text-gray-300 text-xs mt-1 line-clamp-2">{item.summary ?? item.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white text-sm font-semibold flex items-center gap-2"><MessageSquare size={14} className="text-amber-400" /> Feedback recente</h3>
            <span className="text-xs text-gray-500">{feedback.length} itens</span>
          </div>
          <div className="space-y-2 max-h-72 overflow-auto pr-1">
            {feedback.map((item) => (
              <div key={item.id} className="border border-gray-800 rounded-xl p-3 bg-gray-900/60">
                <p className="text-gray-300 text-xs">{item.question || 'Sem pergunta registrada'}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${item.rating >= 4 ? 'text-emerald-300 border-emerald-700 bg-emerald-950/40' : 'text-red-300 border-red-700 bg-red-950/40'}`}>
                    rating {item.rating}
                  </span>
                  <span className="text-[11px] text-gray-500">{item.feedback_type ?? 'sem tipo'}</span>
                </div>
                {item.comment && <p className="text-gray-400 text-xs mt-1">{item.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-sm font-semibold flex items-center gap-2"><Users size={14} className="text-cyan-400" /> Learning Queue</h3>
          <span className="text-xs text-gray-500">{queue.length} itens</span>
        </div>
        <div className="space-y-2 max-h-80 overflow-auto pr-1">
          {queue.map((item) => (
            <div key={item.id} className="border border-gray-800 rounded-xl p-3 bg-gray-900/60">
              <p className="text-gray-300 text-xs">{item.question || 'Sem pergunta'}</p>
              <p className="text-gray-500 text-[11px] mt-1">{item.issue_type ?? 'sem tipo'} · {item.status}</p>
              <div className="flex items-center gap-2 mt-2">
                {['reviewing', 'approved', 'rejected', 'implemented'].map((status) => (
                  <button
                    key={status}
                    onClick={() => updateQueueStatus(item.id, status)}
                    className="text-[11px] px-2 py-1 rounded-lg border border-gray-700 text-gray-300 hover:border-cyan-500 hover:text-cyan-300 transition-colors"
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
