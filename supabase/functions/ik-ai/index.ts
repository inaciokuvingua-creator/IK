import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type Intent =
  | "GENERAL"
  | "FINANCE"
  | "ACCOUNTING"
  | "BUSINESS"
  | "ENTREPRENEURSHIP"
  | "MANAGEMENT"
  | "FINANCIAL_ANALYSIS"
  | "CALCULATION"
  | "EDUCATION"
  | "IK_HELP"
  | "USER_DATA"
  | "REPORT"
  | "RECOMMENDATION";

type KnowledgeItem = {
  category: string;
  subcategory?: string | null;
  topic: string;
  title: string;
  content: string;
  summary?: string | null;
  keywords?: string[] | null;
  formulas?: string[] | null;
  difficulty?: string | null;
  language?: string | null;
  source?: string | null;
  source_type?: string | null;
  confidence?: number | null;
  version?: number | null;
  score?: number;
};

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value).split(" ").filter(Boolean);
}

function detectIntent(message: string, context: string): Intent {
  const lower = normalizeText(`${message} ${context}`);
  const rules: Array<[Intent, RegExp[]]> = [
    ["IK_HELP", [/ik finance|ikfinance|cofre|relatorio|relatórios|financeiro|perfil|configuracoes|configurações|dashboard|meta|negocio|negócio/]],
    ["CALCULATION", [/calcula|cálculo|juros|roi|roa|roe|margem|break even|ponto de equilibrio|ponto de equilíbrio|markup|cac|ltv|churn|ticket medio|ticket médio|runway|burn rate|liquidez/]],
    ["ACCOUNTING", [/contabilidade|ativo|passivo|patrimonio liquido|patrimônio líquido|debito|débito|credito|crédito|partidas dobradas|balanco patrimonial|balanço patrimonial|competencia|competência/]],
    ["BUSINESS", [/negocio|negócio|empresa|lucro|despesa|receita|caixa|fluxo de caixa|rentabilidade|eficiencia|eficiência|analise|análise/]],
    ["ENTREPRENEURSHIP", [/empreendedor|mvp|modelo de negocio|modelo de negócio|proposta de valor|público|mercado|concorrência|concorrencia|posicionamento|precificação|marketing|vendas|cliente/]],
    ["MANAGEMENT", [/gestão|gestao|kpi|indicador|produtividade|processos|estratégia|estrategia|fornecedor|estoque|pessoas|clientes/]],
    ["FINANCE", [/finança|finanças|poupança|poupanca|orçamento|orcamento|despesa|receita|dívida|divida|juros|inflação|inflacao|reserva|salário|salario|patrimônio|patrimonio/]],
    ["REPORT", [/relatório|relatorio|histórico|historico|evolução|evolucao|tendência|tendencia|resumo/]],
    ["RECOMMENDATION", [/sugere|sugestão|sugestao|recomenda|devo fazer|proposta|previsão|previsao/]],
    ["USER_DATA", [/meu|minha|meus|minhas|quanto gastei|quanto tenho|qual é minha|qual e minha|como está meu|como esta meu/]],
  ];

  for (const [intent, patterns] of rules) {
    if (patterns.some((pattern) => pattern.test(lower))) return intent;
  }

  if (/o que é|o que e|explique|defina|conceito|como funciona/.test(lower)) return "EDUCATION";
  return "GENERAL";
}

function inferKnowledgeCategories(intent: Intent, context: string) {
  const ctx = normalizeText(context);
  if (ctx.includes("minha-loja") || ctx.includes("marketplace")) return ["IK_FINANCE", "BUSINESS", "ENTREPRENEURSHIP", "MANAGEMENT"];
  if (ctx.includes("negocios") || ctx.includes("empresas")) return ["BUSINESS", "MANAGEMENT", "ENTREPRENEURSHIP", "ACCOUNTING"];
  if (ctx.includes("financeiro") || ctx.includes("cofres") || ctx.includes("dashboard") || ctx.includes("patrimonio")) return ["FINANCE", "ACCOUNTING", "IK_FINANCE"];
  if (intent === "IK_HELP") return ["IK_FINANCE"];
  if (intent === "ACCOUNTING") return ["ACCOUNTING", "FINANCE"];
  if (intent === "ENTREPRENEURSHIP") return ["ENTREPRENEURSHIP", "MANAGEMENT", "BUSINESS"];
  if (intent === "MANAGEMENT") return ["MANAGEMENT", "BUSINESS"];
  if (intent === "BUSINESS") return ["BUSINESS", "FINANCE", "ACCOUNTING"];
  return ["FINANCE", "ACCOUNTING", "BUSINESS", "ENTREPRENEURSHIP", "MANAGEMENT", "IK_FINANCE"];
}

function rankKnowledge(message: string, rows: KnowledgeItem[]) {
  const query = normalizeText(message);
  const queryTerms = tokenize(query);

  return rows
    .map((row) => {
      const haystack = normalizeText(
        [
          row.category,
          row.subcategory ?? "",
          row.topic,
          row.title,
          row.summary ?? "",
          row.content,
          ...(row.keywords ?? []),
          ...(row.formulas ?? []),
        ].join(" ")
      );

      let score = (row.confidence ?? 0.5) * 4;
      if (haystack.includes(query)) score += 6;
      queryTerms.forEach((term) => {
        if (haystack.includes(term)) score += 1.5;
      });
      if ((row.keywords ?? []).some((keyword) => queryTerms.includes(normalizeText(keyword)))) score += 1.5;
      if (queryTerms.some((term) => normalizeText(row.title).includes(term))) score += 2;
      return { ...row, score };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 6);
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-AO", { maximumFractionDigits: 2 }) + " AOA";
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function buildFinancialContext(financialData: Record<string, unknown> | undefined) {
  if (!financialData) return "";
  const txs = financialData.recentTransactions as Array<{ tipo: string; valor: number; categoria: string; data_transacao: string }> | undefined;
  let ctx = "\n\n[DADOS FINANCEIROS AUTORIZADOS PELO UTILIZADOR]\n";
  const saldoCofres = safeNumber(financialData.saldoCofres);
  const totalReceitas = safeNumber(financialData.totalReceitas);
  const totalDespesas = safeNumber(financialData.totalDespesas);
  const lucroNegocios = safeNumber(financialData.lucroNegocios);
  const totalPatrimonio = safeNumber(financialData.totalPatrimonio);
  if (totalReceitas) ctx += `- Receitas totais: ${formatCurrency(totalReceitas)}\n`;
  if (totalDespesas) ctx += `- Despesas totais: ${formatCurrency(totalDespesas)}\n`;
  if (saldoCofres) ctx += `- Saldo nos cofres: ${formatCurrency(saldoCofres)}\n`;
  if (lucroNegocios || lucroNegocios === 0) ctx += `- Resultado dos negócios: ${formatCurrency(lucroNegocios)}/mês\n`;
  if (totalPatrimonio) ctx += `- Patrimônio total: ${formatCurrency(totalPatrimonio)}\n`;
  if (txs?.length) {
    ctx += "- Últimas transações:\n";
    txs.slice(0, 5).forEach((tx) => {
      const sign = tx.tipo === "entrada" ? "+" : "-";
      ctx += `  • ${sign}${formatCurrency(safeNumber(tx.valor))} (${tx.categoria}) em ${tx.data_transacao}\n`;
    });
  }
  return ctx;
}

function buildUserSnapshot(
  profile: Record<string, unknown> | null,
  financialData: Record<string, unknown> | undefined,
  realtimeContext: Record<string, unknown> | undefined,
  userContext: Record<string, unknown> | undefined,
  intent: Intent,
) {
  const financial = financialData ?? {};
  const totalReceitas = safeNumber(financial.totalReceitas);
  const totalDespesas = safeNumber(financial.totalDespesas);
  const saldoCofres = safeNumber(financial.saldoCofres);
  const totalPatrimonio = safeNumber(financial.totalPatrimonio);
  const lucroNegocios = safeNumber(financial.lucroNegocios);
  const balance = totalReceitas - totalDespesas;

  return {
    intent,
    profile: profile ?? {},
    userContext: userContext ?? {},
    realtimeContext: realtimeContext ?? {},
    financial: financialData ?? null,
    summary: {
      totalReceitas,
      totalDespesas,
      saldoCofres,
      totalPatrimonio,
      lucroNegocios,
      balance,
      savingsRate: totalReceitas > 0 ? (balance / totalReceitas) * 100 : null,
    },
  };
}

function buildCalculationBlock(message: string, financialData?: Record<string, unknown>) {
  if (!financialData) return null;
  const lower = normalizeText(message);
  const totalReceitas = safeNumber(financialData.totalReceitas);
  const totalDespesas = safeNumber(financialData.totalDespesas);
  const saldoCofres = safeNumber(financialData.saldoCofres);
  const lucroNegocios = safeNumber(financialData.lucroNegocios);
  const totalPatrimonio = safeNumber(financialData.totalPatrimonio);
  const lines: string[] = [];

  if (/margem|lucro|resultado/.test(lower)) {
    const lucro = totalReceitas - totalDespesas + lucroNegocios;
    const margem = totalReceitas > 0 ? (lucro / totalReceitas) * 100 : null;
    lines.push(`Lucro estimado: ${formatCurrency(lucro)}`);
    if (margem !== null) lines.push(`Margem estimada: ${margem.toFixed(2)}%`);
  }

  if (/sald|cofre|quanto tenho|quanto gastei|despesa/.test(lower)) {
    lines.push(`Saldo nos cofres: ${formatCurrency(saldoCofres)}`);
    lines.push(`Receitas: ${formatCurrency(totalReceitas)}`);
    lines.push(`Despesas: ${formatCurrency(totalDespesas)}`);
  }

  if (/patrim|ativo|activos|ativos/.test(lower)) {
    lines.push(`Patrimônio total: ${formatCurrency(totalPatrimonio)}`);
  }

  if (/break even|ponto de equilibrio|ponto de equilíbrio/.test(lower)) {
    const marginContribution = totalReceitas > 0 ? totalReceitas - totalDespesas : 0;
    if (marginContribution > 0) {
      const breakEven = totalDespesas / (marginContribution / Math.max(totalReceitas, 1));
      lines.push(`Ponto de equilíbrio estimado: ${formatCurrency(breakEven)}`);
    }
  }

  return lines.length ? lines.join("\n") : null;
}

function buildStructuredAnswer(params: {
  message: string;
  intent: Intent;
  knowledge: KnowledgeItem[];
  financialData?: Record<string, unknown>;
  profile: Record<string, unknown> | null;
  realtimeContext?: Record<string, unknown>;
  userContext?: Record<string, unknown>;
}) {
  const { message, intent, knowledge, financialData, profile, realtimeContext, userContext } = params;
  const hasFinancialData = Boolean(financialData);
  const lower = normalizeText(message);
  const sections: string[] = [];

  const summaryParts: string[] = [];
  if (/o que é|o que e|explique|defina|conceito|como funciona|significa/.test(lower)) {
    summaryParts.push("A pergunta pede uma explicação conceitual, então vou priorizar a base de conhecimento.");
  } else if (/quanto|qual minha|meu|minha|cresceu|aumentou|diminuiu|está|esta/.test(lower) && hasFinancialData) {
    summaryParts.push("A pergunta pede leitura dos seus dados reais, então vou cruzar contexto, histórico e conhecimento.");
  } else if (intent === "RECOMMENDATION") {
    summaryParts.push("A pergunta pede sugestão prática, então vou propor ação, cautela e próximos passos.");
  } else {
    summaryParts.push("Vou responder de forma objetiva, com conhecimento, contexto e, quando existir, dados reais do utilizador.");
  }

  if (knowledge.length > 0) {
    summaryParts.push(`Encontrei ${knowledge.length} referência(s) relevante(s) na base interna do IK Finance.`);
  }

  sections.push(`Resumo\n${summaryParts.join(" ")}`);

  const analysisParts: string[] = [];
  if (knowledge.length > 0) {
    const lead = knowledge[0];
    analysisParts.push(`Base principal: ${lead.title}.`);
    analysisParts.push(lead.summary ?? lead.content);
  } else {
    analysisParts.push("Não encontrei uma correspondência forte na base. A resposta será construída com os dados disponíveis e com cautela.");
  }
  if (realtimeContext && Object.keys(realtimeContext).length > 0) {
    analysisParts.push("Detectei eventos recentes em tempo real na conta do utilizador e levei isso em conta na resposta.");
  }
  if (userContext && Object.keys(userContext).length > 0) {
    analysisParts.push("O perfil e o contexto do utilizador foram considerados para personalizar a resposta.");
  }
  sections.push(`Análise\n${analysisParts.join(" ")}`);

  const calcBlock = buildCalculationBlock(message, financialData);
  if (calcBlock) {
    sections.push(`Cálculo\n${calcBlock}`);
  } else if (hasFinancialData && /quanto|qual|meu|minha|cresceu|diminuiu|gastei|economizei/.test(lower)) {
    sections.push(`Cálculo\nNão tenho dados suficientes para fechar um cálculo confiável neste momento.`);
  }

  const interpretationParts: string[] = [];
  if (hasFinancialData) {
    const data = financialData as Record<string, unknown>;
    const totalReceitas = safeNumber(data.totalReceitas);
    const totalDespesas = safeNumber(data.totalDespesas);
    const balance = totalReceitas - totalDespesas;
    if (totalReceitas > 0) {
      interpretationParts.push(`Receitas: ${formatCurrency(totalReceitas)}.`);
      interpretationParts.push(`Despesas: ${formatCurrency(totalDespesas)}.`);
      interpretationParts.push(balance >= 0 ? `O saldo operacional está positivo em ${formatCurrency(balance)}.` : `O saldo operacional está negativo em ${formatCurrency(Math.abs(balance))}.`);
    }
  }
  if (!interpretationParts.length) {
    interpretationParts.push("A interpretação depende do contexto e dos dados reais. Onde eles existirem, a análise fica mais precisa.");
  }
  sections.push(`Interpretação\n${interpretationParts.join(" ")}`);

  const suggestions: string[] = [];
  if (hasFinancialData) {
    suggestions.push("Revise as maiores despesas e procure reduzir custos recorrentes.");
    suggestions.push("Separe parte da receita para reserva e crescimento.");
    suggestions.push("Use relatórios para acompanhar tendências e não apenas valores isolados.");
  } else {
    suggestions.push("Se quiser uma resposta mais precisa, autorize o acesso aos dados financeiros relevantes.");
    suggestions.push("Posso detalhar o conceito, o cálculo e a forma de interpretação com mais contexto.");
  }
  if (intent === "ENTREPRENEURSHIP" || intent === "BUSINESS" || intent === "MANAGEMENT") {
    suggestions.push("Teste a ideia, valide margens e acompanhe fluxo de caixa antes de escalar.");
  }
  sections.push(`Sugestões\n${suggestions.map((item) => `- ${item}`).join("\n")}`);

  const totalReceitas = hasFinancialData ? safeNumber((financialData as Record<string, unknown>).totalReceitas) : 0;
  const totalDespesas = hasFinancialData ? safeNumber((financialData as Record<string, unknown>).totalDespesas) : 0;
  const forecastParts: string[] = [];
  if (hasFinancialData && totalReceitas > 0) {
    const savingsRate = Math.max(0, ((totalReceitas - totalDespesas) / totalReceitas) * 100);
    forecastParts.push(`Se a disciplina atual se mantiver, a taxa de poupança tende a ficar por volta de ${savingsRate.toFixed(1)}%.`);
    forecastParts.push("Se as despesas continuarem acima da receita, o negócio ou a vida financeira vão precisar de correção de rota.");
  } else {
    forecastParts.push("Sem dados financeiros suficientes, a previsão é qualitativa: foco em controlo, clareza de metas e consistência de acompanhamento.");
  }
  sections.push(`Previsão\n${forecastParts.join(" ")}`);

  if (knowledge.length > 0) {
    sections.push(
      `Conhecimento aplicado\n${knowledge
        .slice(0, 3)
        .map((item) => `- ${item.title}: ${item.summary ?? item.content}`)
        .join("\n")}`
    );
  }

  return sections.join("\n\n");
}

function buildInsightSummary(params: {
  profile: Record<string, unknown> | null;
  financialData?: Record<string, unknown>;
  realtimeContext?: Record<string, unknown>;
  intent: Intent;
  message: string;
}) {
  const { profile, financialData, realtimeContext, intent, message } = params;
  const name = String(profile?.nome ?? profile?.full_name ?? profile?.display_name ?? "utilizador");
  const lower = normalizeText(message);
  const financial = financialData ?? {};
  const balance = safeNumber(financial.totalReceitas) - safeNumber(financial.totalDespesas);
  const realtimeKeys = realtimeContext ? Object.keys(realtimeContext).length : 0;

  const focus = /negocio|empresa|lucro|margem/.test(lower)
    ? "negócios"
    : /cofre|poupanca|poupança|reserva|salario|salário|despesa|receita/.test(lower)
      ? "finanças pessoais"
      : /roi|margem|break even|break-even|cash flow|fluxo de caixa/.test(lower)
        ? "análise financeira"
        : intent === "IK_HELP"
          ? "uso do IK Finance"
          : "aprendizado geral";

  return `${name} focou em ${focus}. Saldo líquido atual: ${formatCurrency(balance)}. Eventos em tempo real considerados: ${realtimeKeys}.`;
}

async function fetchOpenAIAnswer(opts: {
  apiKey: string;
  model: string;
  maxTokens: number;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      max_tokens: opts.maxTokens,
      temperature: 0.4,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const adminClient = createClient(supabaseUrl, serviceRole);

    const { data: settings } = await adminClient
      .from("system_settings")
      .select("chave, valor")
      .in("chave", ["ai_enabled", "ai_name", "ai_persona", "ai_model", "ai_max_tokens", "ai_daily_limit", "ai_premium_limit"]);

    const cfg: Record<string, string> = {};
    (settings ?? []).forEach((setting: { chave: string; valor: string }) => {
      cfg[setting.chave] = setting.valor;
    });

    if (cfg.ai_enabled === "false") return err("O assistente IK Finance AI está desativado.", 503);

    const aiName = cfg.ai_name ?? "IK Finance AI";
    const aiPersona = cfg.ai_persona ?? "Você é o IK Finance AI.";
    const aiModel = cfg.ai_model ?? "gpt-4o-mini";
    const maxTokens = Number.parseInt(cfg.ai_max_tokens ?? "1400", 10);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userToken = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser(userToken);
    if (authErr || !user) return err("Não autorizado", 401);

    const body = await req.json() as {
      message: string;
      history: Array<{ role: "user" | "assistant"; content: string }>;
      context: string;
      financialData?: Record<string, unknown>;
      conversationId?: string;
      file?: { name?: string; mimeType?: string; url?: string; kind?: string };
      userContext?: Record<string, unknown>;
      realtimeContext?: Record<string, unknown>;
      feedback?: {
        rating: number;
        feedbackType: string;
        comment?: string;
        question?: string;
        answer?: string;
      };
    };

    const {
      message,
      history = [],
      context = "geral",
      financialData,
      conversationId,
      file,
      userContext,
      realtimeContext,
      feedback,
    } = body;

    if (!message?.trim()) return err("Mensagem vazia");

    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("user_id, nome, full_name, display_name, plan, country, idioma, preferred_language, city, verified, verification_type, trial_active, trial_ends_at")
      .eq("user_id", user.id)
      .maybeSingle();

    const userPlan = (profile as { plan?: string } | null)?.plan ?? "free";
    const dailyLimit = userPlan === "free"
      ? Number.parseInt(cfg.ai_daily_limit ?? "60", 10)
      : Number.parseInt(cfg.ai_premium_limit ?? "700", 10);

    const today = new Date().toISOString().split("T")[0];
    const { count } = await adminClient
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00Z`);

    if ((count ?? 0) >= dailyLimit) {
      return err(
        `Limite diário de ${dailyLimit} mensagens atingido. ${userPlan === "free" ? "Faça upgrade para Premium para mais mensagens." : "Tente novamente amanhã."}`,
        429,
      );
    }

    const intent = detectIntent(message, context);
    const intentCategories = inferKnowledgeCategories(intent, context);

    let knowledgeRows: KnowledgeItem[] = [];
    try {
      const { data } = await adminClient
        .from("ik_ai_knowledge")
        .select("category, subcategory, topic, title, content, summary, keywords, formulas, difficulty, language, source, source_type, confidence, version")
        .eq("status", "active")
        .eq("language", "pt")
        .in("category", intentCategories)
        .limit(80);
      knowledgeRows = (data ?? []) as KnowledgeItem[];
    } catch (_error) {
      knowledgeRows = [];
    }

    if (knowledgeRows.length === 0) {
      const { data } = await adminClient
        .from("ik_ai_knowledge")
        .select("category, subcategory, topic, title, content, summary, keywords, formulas, difficulty, language, source, source_type, confidence, version")
        .eq("status", "active")
        .eq("language", "pt")
        .limit(80);
      knowledgeRows = (data ?? []) as KnowledgeItem[];
    }

    const rankedKnowledge = rankKnowledge(message, knowledgeRows);
    const userSnapshot = buildUserSnapshot(profile ?? null, financialData, realtimeContext, userContext, intent);
    const financialContext = buildFinancialContext(financialData);
    const knowledgeContext = rankedKnowledge
      .slice(0, 4)
      .map((item) => `- ${item.title}: ${item.summary ?? item.content}`)
      .join("\n");

    const attachmentContext = file
      ? `\n\n[ANEXO RECEBIDO PARA ANÁLISE]\n- Nome: ${file.name ?? "sem nome"}\n- Tipo MIME: ${file.mimeType ?? "desconhecido"}\n- Tipo detectado: ${file.kind ?? "desconhecido"}\n- URL: ${file.url ?? "sem URL"}\n`
      : "";

    const systemPrompt = `${aiPersona}\n\nVocê é ${aiName}, o assistente oficial e nativo da plataforma IK Finance — Financial & Business Copilot.\n\nREGRAS:\n- Responda em português, com tom humano, profissional, didático, analítico e prático.\n- Se a pergunta for educativa, priorize a base de conhecimento.\n- Se for pessoal ou analítica, use dados reais do utilizador quando autorizados.\n- Nunca invente números, transações, saldos, património ou funcionalidades.\n- Quando não houver dados suficientes, diga isso claramente.\n- Sempre que possível, entregue: Resumo, Análise, Cálculo, Interpretação, Sugestões e Previsão.\n- O assistente também deve ser útil em negociação, marketing, comunicação humana, contexto emocional e leitura de intenção, desde que não invente factos.\n\n[INTENÇÃO DETECTADA]\n${intent}\n\n[CONTEXTO ATUAL]\n${context}${attachmentContext}${financialContext}\n\n[SNAPSHOT DO UTILIZADOR]\n${JSON.stringify(userSnapshot, null, 2)}\n\n[BASE DE CONHECIMENTO RELEVANTE]\n${knowledgeContext || "Nenhum item forte encontrado."}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.slice(-12).map((entry) => ({ role: entry.role, content: entry.content } as const)),
      { role: "user" as const, content: message },
    ];

    let assistantMessage = buildStructuredAnswer({
      message,
      intent,
      knowledge: rankedKnowledge,
      financialData,
      profile: profile ?? null,
      realtimeContext,
      userContext,
    });

    let tokensIn = 0;
    let tokensOut = 0;
    let engineUsed = "ik-native";

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (openaiKey) {
      try {
        const openaiAnswer = await fetchOpenAIAnswer({
          apiKey: openaiKey,
          model: aiModel === "ik-native" ? "gpt-4o-mini" : aiModel,
          maxTokens,
          messages,
        });
        if (openaiAnswer?.trim()) {
          assistantMessage = openaiAnswer.trim();
          engineUsed = aiModel;
        }
      } catch (_error) {
        // Falha externa nunca bloqueia o fluxo nativo.
      }
    }

    if (rankedKnowledge.length === 0) {
      await adminClient.from("ik_ai_learning_queue").insert({
        question: message,
        answer: assistantMessage,
        feedback: "knowledge_gap_detected",
        category: intent,
        issue_type: "knowledge_gap",
        suggested_improvement: "Criar ou rever conteúdo para esta intenção e consolidar exemplos práticos.",
        status: "pending",
      });
    }

    if (feedback) {
      await adminClient.from("ik_ai_feedback").insert({
        user_id: user.id,
        conversation_id: conversationId ?? null,
        rating: feedback.rating,
        feedback_type: feedback.feedbackType,
        comment: feedback.comment ?? null,
        question: feedback.question ?? message,
        answer: feedback.answer ?? assistantMessage,
        category: intent,
      });

      if (feedback.rating < 3) {
        await adminClient.from("ik_ai_learning_queue").insert({
          question: feedback.question ?? message,
          answer: feedback.answer ?? assistantMessage,
          feedback: feedback.comment ?? "negative_feedback",
          category: intent,
          issue_type: feedback.feedbackType,
          suggested_improvement: "Revisar a resposta, melhorar a base e validar a explicação antes de promover para conhecimento oficial.",
          status: "pending",
        });
      }
    }

    await adminClient.from("ai_usage_log").insert({
      user_id: user.id,
      contexto: context,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      modelo: engineUsed,
    });

    const newHistory = [...history, { role: "user" as const, content: message }, { role: "assistant" as const, content: assistantMessage }];
    const titulo = history.length === 0 ? message.substring(0, 60) : undefined;

    const insightSummary = buildInsightSummary({
      profile: profile ?? null,
      financialData,
      realtimeContext,
      intent,
      message,
    });

    if (conversationId) {
      await adminClient
        .from("ai_conversations")
        .update({ mensagens: newHistory, updated_at: new Date().toISOString(), ...(titulo && { titulo }) })
        .eq("id", conversationId)
        .eq("user_id", user.id);
    } else {
      const { data: conv } = await adminClient
        .from("ai_conversations")
        .insert({ user_id: user.id, titulo: titulo ?? "Conversa", mensagens: newHistory, contexto: context })
        .select("id")
        .single();
      const createdConversationId = conv?.id;
      if (createdConversationId) {
        await adminClient.from("ik_ai_user_insights").upsert({
          user_id: user.id,
          profile_snapshot: userSnapshot,
          summary: insightSummary,
          last_conversation_id: createdConversationId,
          last_realtime_snapshot: realtimeContext ?? {},
        }, { onConflict: "user_id" });
        return ok({ message: assistantMessage, conversationId: createdConversationId });
      }
    }

    await adminClient.from("ik_ai_user_insights").upsert({
      user_id: user.id,
      profile_snapshot: userSnapshot,
      summary: insightSummary,
      last_conversation_id: conversationId ?? null,
      last_realtime_snapshot: realtimeContext ?? {},
    }, { onConflict: "user_id" });

    return ok({ message: assistantMessage, conversationId: conversationId ?? null });
  } catch (e) {
    console.error("[ik-ai]", e);
    return err(String(e), 500);
  }
});