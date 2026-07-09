import { useCallback, useEffect, useState } from 'react';
import { Save, RefreshCw, Check, AlertTriangle, Lock, Eye, EyeOff } from 'lucide-react';
import { adminApi, type SystemSetting } from '../api';

const SETTING_META: Record<string, { label: string; desc: string; type: 'text' | 'toggle' | 'number' | 'textarea' }> = {
  platform_name:    { label: 'Nome da plataforma',      desc: 'Nome exibido no app e e-mails',              type: 'text' },
  platform_tagline: { label: 'Slogan',                  desc: 'Subtítulo da plataforma',                    type: 'text' },
  maintenance_mode: { label: 'Modo de manutenção',      desc: 'Bloqueia login de utilizadores comuns',       type: 'toggle' },
  global_message:   { label: 'Mensagem global',         desc: 'Mensagem exibida para todos os utilizadores', type: 'textarea' },
  plan_free_label:  { label: 'Rótulo plano gratuito',   desc: 'Nome do plano gratuito',                     type: 'text' },
  plan_pro_label:   { label: 'Rótulo plano Pro',        desc: 'Nome do plano pago',                         type: 'text' },
  plan_pro_price:   { label: 'Preço plano Pro (Kz/mês)','desc': 'Valor mensal do plano Pro',                type: 'number' },
  support_email:    { label: 'E-mail de suporte',       desc: 'Contacto de suporte exibido no app',         type: 'text' },
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Password change
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const showToast = useCallback((ok: boolean, msg: string) => { setToast({ ok, msg }); setTimeout(() => setToast(null), 3000); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await adminApi.settings();
      setSettings(s);
      const v: Record<string, string> = {};
      s.forEach((item) => { v[item.chave] = item.valor; });
      setValues(v);
    } catch (e) { showToast(false, (e as Error).message); }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const updates = settings.map((s) => ({ chave: s.chave, valor: values[s.chave] ?? s.valor }));
      await adminApi.saveSettings(updates);
      showToast(true, 'Configurações salvas com sucesso');
    } catch (e) { showToast(false, (e as Error).message); }
    setSaving(false);
  };

  const changePwd = async () => {
    if (newPwd !== confPwd) { showToast(false, 'As senhas não coincidem'); return; }
    if (newPwd.length < 8) { showToast(false, 'Senha deve ter pelo menos 8 caracteres'); return; }
    setPwdLoading(true);
    try {
      await adminApi.changePassword(curPwd, newPwd);
      showToast(true, 'Senha alterada com sucesso');
      setCurPwd(''); setNewPwd(''); setConfPwd('');
    } catch (e) { showToast(false, (e as Error).message); }
    setPwdLoading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações do Sistema</h1>
          <p className="text-gray-500 text-sm">Parâmetros globais da plataforma IK Finance</p>
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

      {/* Platform settings */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold text-white text-sm flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full" /> Plataforma
        </h2>

        {loading ? (
          <div className="space-y-4">{[1,2,3,4].map((i) => <div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse" />)}</div>
        ) : (
          Object.entries(SETTING_META).map(([key, meta]) => {
            if (!(key in values)) return null;
            return (
              <div key={key}>
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <label className="text-white text-sm font-medium">{meta.label}</label>
                    <p className="text-gray-500 text-xs">{meta.desc}</p>
                  </div>
                  {meta.type === 'toggle' && (
                    <button
                      onClick={() => setValues({ ...values, [key]: values[key] === 'true' ? 'false' : 'true' })}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${values[key] === 'true' ? 'bg-red-600' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${values[key] === 'true' ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  )}
                </div>
                {meta.type !== 'toggle' && (
                  meta.type === 'textarea' ? (
                    <textarea
                      value={values[key] ?? ''}
                      onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors resize-none"
                      placeholder="Mensagem para todos os utilizadores..."
                    />
                  ) : (
                    <input
                      type={meta.type}
                      value={values[key] ?? ''}
                      onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  )
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

      {/* Change password */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-white text-sm flex items-center gap-2">
          <Lock size={15} className="text-red-400" /> Alterar Senha do Admin
        </h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Senha atual</label>
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} value={curPwd} onChange={(e) => setCurPwd(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:border-red-500 transition-colors" />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Nova senha</label>
          <input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Confirmar nova senha</label>
          <input type={showPwd ? 'text' : 'password'} value={confPwd} onChange={(e) => setConfPwd(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors" />
        </div>
        <button onClick={changePwd} disabled={pwdLoading || !curPwd || !newPwd || !confPwd}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white text-sm font-medium border border-gray-700 px-4 py-2.5 rounded-xl transition-colors">
          <Lock size={14} /> {pwdLoading ? 'Alterando...' : 'Alterar Senha'}
        </button>
      </div>
    </div>
  );
}
