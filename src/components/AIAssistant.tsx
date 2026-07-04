import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles, X, Send, ChevronDown, RotateCcw,
  TrendingUp, Store, Building2, BarChart3, Lock, Info,
  Minimize2, Maximize2,
} from 'lucide-react';
import { useAI, type AiMessage, type AiContext } from '../context/AIContext';
import { useProfile } from '../context/ProfileContext';

type Props = {
  financialData?: Record<string, unknown>;
  currentPage?: string;
};

const CONTEXT_MAP: Record<string, AiContext> = {
  dashboard: 'financeiro', cofres: 'financeiro', financeiro: 'financeiro',
  negocios: 'empresarial', patrimonio: 'financeiro', relatorios: 'financeiro',
  marketplace: 'marketplace', 'minha-loja': 'marketplace',
  empresas: 'empresarial',
};

const CONTEXT_META: Record<AiContext, { label: string; icon: React.ElementType; color: string }> = {
  geral:       { label: 'Geral',       icon: Sparkles,  color: 'text-emerald-400' },
  financeiro:  { label: 'Financeiro',  icon: TrendingUp, color: 'text-blue-400' },
  empresarial: { label: 'Empresarial', icon: Building2,  color: 'text-amber-400' },
  marketplace: { label: 'Marketplace', icon: Store,      color: 'text-purple-400' },
};

const QUICK_PROMPTS: Record<AiContext, string[]> = {
  geral: [
    'Como funciona a plataforma?',
    'O que são os cofres?',
    'Como criar minha loja?',
    'Quais são os planos disponíveis?',
  ],
  financeiro: [
    'Analise minhas finanças',
    'Como melhorar meu saldo?',
    'Explique meus relatórios',
    'Como usar os cofres?',
  ],
  empresarial: [
    'Como organizar minha equipe?',
    'Como criar departamentos?',
    'Como convidar membros?',
    'Dicas de gestão empresarial',
  ],
  marketplace: [
    'Como criar um produto digital?',
    'Como definir preços?',
    'Dicas para vender mais',
    'Como otimizar minha loja?',
  ],
};

export default function AIAssistant({ financialData, currentPage = 'dashboard' }: Props) {
  const { t } = useTranslation();
  const { sendMessage, loading, error, privacy, updatePrivacy } = useAI();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConvId] = useState<string | undefined>();
  const [context, setContext] = useState<AiContext>('geral');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-detect context from current page
  useEffect(() => {
    const detected = CONTEXT_MAP[currentPage] ?? 'geral';
    setContext(detected);
  }, [currentPage]);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 100);
    }
  }, [open, minimized, messages.length]);

  const handleOpen = () => {
    setOpen(true);
    setMinimized(false);
    if (messages.length === 0) {
      // Welcome message
      setMessages([{
        role: 'assistant',
        content: `Olá${profile?.nome ? `, ${profile.nome}` : ''}! Sou o **IK Finance AI**, seu assistente inteligente. Estou aqui para ajudá-lo com finanças, negócios, marketplace e muito mais.\n\nO que posso fazer por você hoje?`,
        ts: Date.now(),
      }]);
    }
  };

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: AiMessage = { role: 'user', content: msg, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    const historyForApi = messages.map(({ role, content }) => ({ role, content }));
    const result = await sendMessage(msg, historyForApi, context, financialData);

    if (result) {
      setMessages((prev) => [...prev, { role: 'assistant', content: result.message, ts: Date.now() }]);
      if (!conversationId) setConvId(result.conversationId);
    }
  }, [input, loading, messages, sendMessage, context, financialData, conversationId]);

  const reset = () => {
    setMessages([{
      role: 'assistant',
      content: 'Conversa reiniciada. Como posso ajudá-lo?',
      ts: Date.now(),
    }]);
    setConvId(undefined);
  };

  const ctx = CONTEXT_META[context];
  const CtxIcon = ctx.icon;

  // Format markdown-lite (bold **text**, line breaks)
  const formatMessage = (text: string) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <span key={i}>
          {i > 0 && <br />}
          {parts.map((part, j) =>
            j % 2 === 1
              ? <strong key={j} className="font-semibold text-white">{part}</strong>
              : <span key={j}>{part}</span>
          )}
        </span>
      );
    });
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 rounded-2xl shadow-2xl shadow-emerald-900/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group"
          title="IK Finance AI"
        >
          <Sparkles size={22} className="text-white" />
          <span className="absolute -top-10 right-0 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-xl border border-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
            IK Finance AI
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className={`fixed z-50 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl shadow-black/50 flex flex-col transition-all duration-200 ${
          minimized
            ? 'bottom-6 right-6 w-72 h-14'
            : 'bottom-6 right-6 w-96 h-[600px] max-h-[85vh]'
        }`}>
          {/* Header */}
          <div
            className={`flex items-center gap-3 px-4 py-3 border-b border-gray-800 cursor-pointer rounded-t-2xl bg-gradient-to-r from-emerald-950/60 to-teal-950/40 ${minimized ? 'rounded-b-2xl border-0' : ''}`}
            onClick={() => minimized && setMinimized(false)}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
              <Sparkles size={15} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">{t('ai.titulo')}</p>
              {!minimized && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <p className={`text-xs font-medium ${ctx.color}`}>{ctx.label}</p>
                </div>
              )}
            </div>
            {!minimized && (
              <>
                <button onClick={(e) => { e.stopPropagation(); reset(); }} title="Nova conversa"
                  className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
                  <RotateCcw size={13} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setShowPrivacy(!showPrivacy); }} title="Privacidade"
                  className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
                  <Lock size={13} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setMinimized(true); }}
                  className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
                  <Minimize2 size={13} />
                </button>
              </>
            )}
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
              <X size={15} />
            </button>
          </div>

          {!minimized && (
            <>
              {/* Privacy panel */}
              {showPrivacy && (
                <div className="mx-3 mt-3 bg-gray-800/80 border border-gray-700 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock size={13} className="text-amber-400" />
                    <p className="text-white text-xs font-semibold">Controlo de Privacidade</p>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { key: 'enabled', label: 'Assistente IA ativo', desc: 'Ativar/desativar o assistente' },
                      { key: 'allowFinancialData', label: 'Acesso a dados financeiros', desc: 'Permite analisar seus saldos e transações' },
                      { key: 'allowBusinessData', label: 'Acesso a dados empresariais', desc: 'Permite analisar negócios e empresas' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-200 text-xs font-medium">{label}</p>
                          <p className="text-gray-500 text-[10px] mt-0.5">{desc}</p>
                        </div>
                        <button
                          onClick={() => updatePrivacy({ [key]: !privacy[key as keyof typeof privacy] })}
                          className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${privacy[key as keyof typeof privacy] ? 'bg-emerald-500' : 'bg-gray-600'}`}
                        >
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${privacy[key as keyof typeof privacy] ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-gray-600 text-[10px] mt-3 leading-relaxed">A IA nunca acessa dados sem sua autorização explícita.</p>
                </div>
              )}

              {/* Context selector */}
              <div className="mx-3 mt-2 relative">
                <button onClick={() => setShowContextMenu(!showContextMenu)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800/60 border border-gray-700/60 hover:border-gray-600 rounded-xl transition-colors">
                  <CtxIcon size={13} className={ctx.color} />
                  <span className="text-gray-300 text-xs flex-1 text-left">Modo: {ctx.label}</span>
                  <ChevronDown size={12} className={`text-gray-500 transition-transform ${showContextMenu ? 'rotate-180' : ''}`} />
                </button>
                {showContextMenu && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden z-10 shadow-xl">
                    {(Object.entries(CONTEXT_META) as [AiContext, typeof CONTEXT_META[AiContext]][]).map(([id, meta]) => {
                      const Icon = meta.icon;
                      return (
                        <button key={id} onClick={() => { setContext(id); setShowContextMenu(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-700 transition-colors ${context === id ? 'bg-gray-700/60' : ''}`}>
                          <Icon size={13} className={meta.color} />
                          <span className="text-gray-200 text-xs">{meta.label}</span>
                          {context === id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 mt-0.5 mr-2">
                        <Sparkles size={11} className="text-white" />
                      </div>
                    )}
                    <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-sm'
                        : 'bg-gray-800 text-gray-200 rounded-bl-sm'
                    }`}>
                      {formatMessage(msg.content)}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                      <Sparkles size={11} className="text-white" />
                    </div>
                    <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-950/60 border border-red-800/60 rounded-xl px-3.5 py-2.5 text-red-300 text-xs">
                    {error}
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Quick prompts — only when no messages beyond welcome */}
              {messages.length <= 1 && (
                <div className="px-3 pb-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    {QUICK_PROMPTS[context].map((prompt) => (
                      <button key={prompt} onClick={() => send(prompt)}
                        className="text-left text-xs text-gray-400 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 hover:border-gray-600 px-2.5 py-2 rounded-xl transition-colors leading-tight">
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="px-3 pb-3">
                <div className="flex gap-2 bg-gray-800 border border-gray-700 focus-within:border-emerald-500 rounded-xl transition-colors overflow-hidden">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                    placeholder={t('ai.placeholder')}
                    disabled={loading || !privacy.enabled}
                    className="flex-1 bg-transparent text-white text-sm px-3.5 py-3 focus:outline-none placeholder-gray-600 disabled:opacity-40"
                  />
                  <button
                    onClick={() => send()}
                    disabled={loading || !input.trim() || !privacy.enabled}
                    className="w-10 flex items-center justify-center text-gray-500 hover:text-emerald-400 disabled:opacity-30 transition-colors pr-1"
                  >
                    <Send size={16} />
                  </button>
                </div>
                <p className="text-gray-700 text-[10px] text-center mt-1.5">
                  IK Finance AI · Dados: {privacy.allowFinancialData ? 'financeiros ✓' : 'gerais'} · <button onClick={() => setShowPrivacy(true)} className="hover:text-gray-500 transition-colors">privacidade</button>
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
