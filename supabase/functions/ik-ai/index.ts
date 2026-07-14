import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Comprehensive IK Finance knowledge base ──────────────────────────────
const KNOWLEDGE: Record<string, string[]> = {
  greeting: [
    "Olá! Sou o IK Finance AI, o assistente oficial da plataforma IK Finance. Estou aqui para ajudá-lo com finanças, negócios, marketplace e muito mais. Como posso ajudar?",
    "Bem-vindo! Sou o assistente inteligente da IK Finance. Posso explicar funcionalidades, analisar dados (quando autorizado) e ajudá-lo a tirar o máximo da plataforma.",
  ],
  plataforma: [
    "A IK Finance é um ecossistema digital completo criado por Inácio Kuvingua Ulundo, de Huambo, Angola. Inclui gestão financeira pessoal, marketplace, empresas, chat privado e muito mais — tudo numa única plataforma.",
    "A IK Finance é uma plataforma financeira moderna que combina gestão de cofres, negócios, patrimônio, marketplace, empresas e chat. Foi desenhada para angolanos e africanos, mas serve utilizadores do mundo inteiro.",
  ],
  trial: [
    "Ao criar conta na IK Finance, você recebe automaticamente **3 meses de acesso completo gratuito** — o período de teste. Durante este período, tem acesso a TODOS os recursos Premium: IA, cofres ilimitados, marketplace, loja, empresas, chat e relatórios avançados.",
    "O período de teste da IK Finance dura **3 meses completos** a partir da criação da conta. Pode verificar os dias restantes no seu Perfil ou na página Planos. Após o teste, pode continuar no plano gratuito básico ou fazer upgrade.",
  ],
  plano: [
    "A IK Finance tem 4 planos:\n\n**Gratuito** — após o teste: 3 cofres, 50 transações/mês, 1 negócio, marketplace (compra)\n**Premium** — 2.500 Kz/mês: cofres ilimitados, loja, chat, IA, verificação\n**Business** — 7.500 Kz/mês: empresas, 20 funcionários, múltiplas lojas, API\n**Enterprise** — personalizado: organizações ilimitadas, SLA, white-label",
    "Durante os **3 meses de teste gratuito**, todos os recursos Premium estão disponíveis. Após o teste, o plano gratuito mantém acesso básico — a conta nunca é bloqueada. Para continuar com todos os recursos, faça upgrade em Planos.",
  ],
  pagamento: [
    "A IK Finance está a integrar Stripe e PayPal para pagamentos online. Por agora, os planos são ativados directamente. Para pagar, contacte Inaciokuvingua@gmail.com ou WhatsApp +244 943 339 350.",
    "Para upgrade de plano, acesse 'Planos' no menu lateral e escolha o plano desejado. A integração com gateways de pagamento (Stripe, PayPal, transferência bancária) está em desenvolvimento.",
  ],
  cofre: [
    "Os **Cofres** são contas virtuais para organizar o seu dinheiro com objetivos específicos. Pode criar cofres para poupança, viagem, emergência, educação — qualquer objetivo. Cada cofre tem nome, ícone, cor e pode ter uma meta de valor.",
    "Para criar um cofre, vá em 'Cofres' e clique em 'Novo Cofre'. Defina nome, descrição, cor, ícone e uma meta opcional. Pode depositar e levantar dinheiro, e acompanhar o progresso em relação à meta.",
  ],
  financeiro: [
    "A secção **Financeiro** regista todas as suas transações: entradas (salário, rendimentos, recebimentos) e saídas (despesas, pagamentos, compras). Pode categorizar, filtrar por data/tipo/categoria e exportar relatórios.",
    "Para registar uma transação: acesse 'Financeiro' → clique 'Nova Transação' → escolha tipo (entrada/saída), valor, categoria, data. Pode associar a um cofre ou negócio específico.",
  ],
  negocio: [
    "A secção **Negócios** permite registar e gerir os seus empreendimentos. Para cada negócio, controla receita mensal, despesa mensal e acompanha a lucratividade. Categorias incluem comércio, serviços, tecnologia, agricultura e mais.",
    "Para adicionar um negócio: acesse 'Negócios' → 'Novo Negócio' → insira nome, categoria, receita mensal estimada e despesa mensal. A plataforma calcula automaticamente o lucro mensal.",
  ],
  patrimonio: [
    "O **Patrimônio** regista os seus activos: imóveis, veículos, equipamentos, investimentos, criptomoedas e outros bens. Pode acompanhar a valorização (valor actual vs. valor de aquisição) ao longo do tempo.",
    "Para registar um bem patrimonial: acesse 'Patrimônio' → 'Novo Activo' → insira nome, categoria, valor de aquisição, valor actual e data de aquisição. A plataforma mostra automaticamente se valorizou ou desvalorizou.",
  ],
  relatorio: [
    "Os **Relatórios** apresentam a evolução financeira com gráficos de barras e linhas: receitas vs. despesas, saldo por período, evolução do patrimônio, distribuição por categoria. Pode filtrar por período e comparar meses.",
    "Para aceder aos relatórios completos, vá em 'Relatórios'. Os gráficos mostram tendências mensais, categorias de maior gasto, evolução do saldo e muito mais. Disponível para todos durante o período de teste.",
  ],
  marketplace: [
    "O **Marketplace da IK Finance** permite comprar e vender produtos digitais (músicas, beats, cursos, eBooks, templates, software) e físicos. Os vendedores recebem 95% de cada venda — apenas 5% vai para a plataforma.",
    "No marketplace pode encontrar produtos de criadores e vendedores verificados. Para comprar: navegue, filtre por categoria, clique no produto e faça o pedido. Para vender, crie a sua loja em 'Minha Loja'.",
  ],
  loja: [
    "Para criar a sua **loja no marketplace**: acesse 'Minha Loja' → preencha nome, descrição, URL personalizada (ex: ikfinance.com/sua-loja), categoria e logo. Depois adicione produtos com fotos, preço e descrição detalhada.",
    "A loja da IK Finance tem URL personalizada única. Pode vender produtos digitais (com upload de arquivo) e físicos (com gestão de estoque e endereço de entrega). O painel mostra vendas, receitas e avaliações.",
  ],
  empresa: [
    "A secção **Empresas** permite criar e gerir empresas com estrutura organizacional: departamentos, equipes, cargos. Convide funcionários por e-mail e defina funções (admin, gestor, funcionário).",
    "Para criar uma empresa: acesse 'Empresas' → 'Nova Empresa' → insira nome, NIF, setor e descrição. Depois crie departamentos, adicione membros via convite por e-mail e defina cargos e funções.",
  ],
  chat: [
    "O **Chat** permite mensagens privadas em tempo real com outros utilizadores da plataforma. As mensagens são seguras e mostram indicadores de lido/enviado.",
    "Para iniciar uma conversa, acesse 'Mensagens' no menu. Pesquise o utilizador pelo nome ou e-mail e inicie o chat. As mensagens são entregues em tempo real via Supabase Realtime.",
  ],
  perfil: [
    "O seu **Perfil** permite personalizar nome, bio, foto de perfil, país, telefone e redes sociais (Instagram, Facebook, TikTok, YouTube, LinkedIn, Website). Também pode solicitar verificação de conta para obter o selo ✓.",
    "Para editar o perfil: acesse 'Perfil' → clique 'Editar'. Pode fazer upload de foto directamente do dispositivo. Para adicionar redes sociais, insira o handle (ex: @seuusuario) ou URL completa.",
  ],
  verificacao: [
    "A **verificação de conta** mostra um selo azul ✓ no seu perfil, loja e produtos — transmitindo mais credibilidade. Acesse 'Perfil' → 'Solicitar Verificação' → escolha o tipo (Pessoal, Criador, Loja, Empresa). Análise em até 48h.",
    "Existem 4 tipos de verificação: **Pessoal** (identidade), **Criador** (criadores de conteúdo), **Loja** (lojas no marketplace) e **Empresa** (empresas registadas). O selo aparece em todo o ecossistema IK Finance.",
  ],
  ia: [
    "O **IK Finance AI** é o assistente nativo da plataforma, criado para ser o seu consultor digital de finanças e negócios. Pode responder perguntas, explicar funcionalidades, analisar dados (quando autorizado), gerar insights e sugerir melhorias.",
    "Para usar o IK Finance AI ao máximo, vá em Configurações → IK Finance AI e active o acesso a dados financeiros. Assim o assistente pode analisar os seus saldos, transações e dar sugestões personalizadas.",
  ],
  privacidade: [
    "A IK Finance nunca acessa os seus dados financeiros sem autorização explícita. No widget do assistente, clique no ícone de cadeado para controlar o que a IA pode ver. Pode desativar a IA a qualquer momento em Configurações.",
    "Os controlos de privacidade da IA estão em Configurações → IK Finance AI. Pode activar/desactivar o assistente, autorizar acesso a dados financeiros e empresariais — tudo sob o seu controlo.",
  ],
  seguranca: [
    "A IK Finance usa criptografia moderna, autenticação segura via Supabase Auth, Row-Level Security (RLS) em todas as tabelas — nenhum utilizador acede dados de outro. As senhas são hash bcrypt e os tokens expiram automaticamente.",
    "Toda a plataforma usa HTTPS, tokens JWT seguros e políticas de acesso (RLS) que garantem que cada utilizador só vê os seus próprios dados. Os logs de auditoria registam todas as acções administrativas.",
  ],
  moeda: [
    "A IK Finance suporta **7 moedas**: AOA (Kwanza), USD (Dólar), EUR (Euro), GBP (Libra), BRL (Real), CNY (Yuan) e ZAR (Rand). As taxas são actualizadas em tempo real via API. Mude a moeda no selector do menu lateral.",
    "Para mudar a moeda de exibição, clique no selector de moeda no topo do menu lateral (onde aparece AOA, USD, etc.). A conversão é aplicada a todos os valores exibidos na plataforma em tempo real.",
  ],
  notificacao: [
    "As **notificações** da IK Finance chegam como notificações push no browser, por e-mail e dentro da plataforma. Pode configurar quais eventos geram notificações em Configurações → Notificações.",
    "Para activar notificações push, acesse Configurações → Notificações e clique em 'Activar Notificações'. Será pedida permissão no browser. Pode escolher receber notificações de transações, cofres, negócios e muito mais.",
  ],
  pwa: [
    "A IK Finance é uma **PWA (Progressive Web App)** — pode instalar no seu telemóvel como uma app nativa. No Chrome/Edge: clique nos 3 pontos → 'Instalar app'. No iOS Safari: partilhar → 'Adicionar ao ecrã inicial'.",
    "Para instalar a IK Finance no telemóvel: no Android (Chrome) aparece um banner automático de instalação. No iOS (Safari), toque no botão de partilhar e escolha 'Adicionar ao Ecrã de Início'. Funciona offline com dados em cache.",
  ],
  criador: [
    "A IK Finance foi criada por **Inácio Kuvingua Ulundo**, jovem angolano de Huambo. A visão é criar soluções tecnológicas modernas para Angola e África, democratizando o acesso a ferramentas financeiras de qualidade.",
    "O criador da IK Finance é Inácio Kuvingua Ulundo. Pode contactá-lo via WhatsApp: +244 943 339 350 ou e-mail: Inaciokuvingua@gmail.com para suporte, parcerias ou questões Enterprise.",
  ],
  dashboard: [
    "O **Dashboard** é a visão geral da sua saúde financeira. Mostra: saldo total consolidado, saldo por cofres, resultado dos negócios, total do patrimônio e últimas transações. Os dados actualizam em tempo real.",
    "O Dashboard consolida tudo: saldo dos cofres, receitas/despesas do financeiro, lucro dos negócios e valor total do patrimônio. Use os cartões de resumo para navegar rapidamente para cada secção.",
  ],
  saldo: [
    "O seu saldo total aparece no Dashboard e combina: saldo dos cofres + saldo financeiro (entradas - saídas) + resultado dos negócios. Para ver o detalhe, acesse cada secção no menu lateral.",
    "Para ver todos os saldos: no Dashboard está o resumo consolidado. Em 'Cofres' vê o saldo de cada cofre individualmente. Em 'Financeiro' vê entradas e saídas. Em 'Negócios' vê receitas, despesas e lucro por negócio.",
  ],
  suporte: [
    "Para suporte da IK Finance: **WhatsApp** +244 943 339 350 ou **e-mail** Inaciokuvingua@gmail.com. O plano Premium tem suporte prioritário. Para questões Enterprise, contacte para acordo personalizado.",
    "Precisa de ajuda? Entre em contacto: WhatsApp +244 943 339 350 (resposta rápida) ou Inaciokuvingua@gmail.com. Pode também usar o IK Finance AI para dúvidas sobre a plataforma 24/7.",
  ],
  angola: [
    "A IK Finance foi criada em Angola e é especialmente optimizada para a realidade angolana: suporte ao Kwanza (AOA), categorias relevantes para o mercado local, e preços acessíveis em Kwanza.",
    "Angola é o mercado principal da IK Finance. A plataforma suporta AOA como moeda padrão, tem preços em Kwanza e foi desenhada para empreendedores e profissionais angolanos.",
  ],
  default: [
    "Boa pergunta! Posso ajudá-lo com finanças pessoais, negócios, marketplace, empresas, planos, verificação, IA e muito mais. Seja mais específico para uma resposta mais precisa.",
    "Estou aqui para ajudar! Pergunte sobre cofres, transações, negócios, marketplace, planos, empresas, chat ou qualquer funcionalidade da IK Finance.",
    "Para análises detalhadas dos seus dados financeiros, certifique-se de ter autorizado o acesso nas configurações de privacidade do assistente. O que mais posso explicar?",
    "Posso ajudar com: 💰 Finanças (cofres, transações, relatórios) · 🏪 Marketplace (loja, produtos) · 🏢 Empresas · 💬 Chat · 🤖 IA · 📋 Planos. O que precisa?",
  ],
};

function getFallbackResponse(message: string): string {
  const lower = message.toLowerCase();
  const patterns: [RegExp, string][] = [
    [/olá|ola|oi|bom dia|boa tarde|boa noite|hello|hi|hey/i, 'greeting'],
    [/plataforma|ikfinance|ik finance|o que é|como funciona/i, 'plataforma'],
    [/teste|trial|3 meses|gratuito.*meses|meses.*gratuito/i, 'trial'],
    [/plano|premium|business|enterprise|assinatura|upgrade|preço|mensalidade/i, 'plano'],
    [/pagamento|pagar|stripe|paypal|comprar plano|fatura/i, 'pagamento'],
    [/cofre|poupança|guardar.*dinheiro|economizar/i, 'cofre'],
    [/transação|transacao|entrada|saída|saida|despesa|receita.*pessoal/i, 'financeiro'],
    [/negócio|negocio|empreendimento|empresa.*receita|lucro/i, 'negocio'],
    [/patrimônio|patrimonio|imóvel|veículo|veiculo|activo|investimento/i, 'patrimonio'],
    [/relatório|relatorio|gráfico|grafico|analise|evolução|historico/i, 'relatorio'],
    [/marketplace|comprar|produto|vender.*produto/i, 'marketplace'],
    [/loja|minha loja|criar loja|slug.*loja/i, 'loja'],
    [/empresa.*equipe|empresa.*departamento|gerir empresa|membros/i, 'empresa'],
    [/chat|mensagem|conversa|privado/i, 'chat'],
    [/perfil|foto.*perfil|avatar|bio|redes sociais|instagram|facebook/i, 'perfil'],
    [/verificação|verificacao|verificado|selo|badge/i, 'verificacao'],
    [/assistente.*ia|ia.*assistente|chatgpt|gemini|inteligência artificial/i, 'ia'],
    [/privacidade|acesso.*dados|permissão/i, 'privacidade'],
    [/segurança|seguranca|senha|proteção|hack/i, 'seguranca'],
    [/moeda|câmbio|cambio|kwanza|dólar|dollar|euro|usd|aoa/i, 'moeda'],
    [/notificação|notificacao|alerta|push/i, 'notificacao'],
    [/pwa|instalar app|telemóvel|celular|mobile/i, 'pwa'],
    [/criador|inácio|inacio|desenvolvedor|quem criou|angola/i, 'criador'],
    [/dashboard|visão geral|resumo financeiro/i, 'dashboard'],
    [/saldo|quanto tenho|meu dinheiro/i, 'saldo'],
    [/suporte|ajuda|contato|contacto|whatsapp/i, 'suporte'],
    [/angola|kwanza|luanda|huambo|angolano/i, 'angola'],
  ];
  for (const [re, key] of patterns) {
    if (re.test(lower)) {
      const pool = KNOWLEDGE[key];
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }
  const defaults = KNOWLEDGE.default;
  return defaults[Math.floor(Math.random() * defaults.length)];
}

function buildFinancialContext(financialData: Record<string, unknown> | undefined): string {
  if (!financialData) return "";
  const { saldoCofres, totalReceitas, totalDespesas, lucroNegocios, totalPatrimonio, recentTransactions } = financialData as Record<string, unknown>;
  let ctx = "\n\n[DADOS FINANCEIROS AUTORIZADOS PELO UTILIZADOR]\n";
  if (typeof saldoCofres === 'number') ctx += `- Saldo nos cofres: ${saldoCofres.toLocaleString("pt-AO")} AOA\n`;
  if (typeof totalReceitas === 'number') ctx += `- Receitas totais: ${totalReceitas.toLocaleString("pt-AO")} AOA\n`;
  if (typeof totalDespesas === 'number') ctx += `- Despesas totais: ${totalDespesas.toLocaleString("pt-AO")} AOA\n`;
  if (typeof lucroNegocios === 'number') ctx += `- Resultado negócios: ${lucroNegocios.toLocaleString("pt-AO")} AOA/mês\n`;
  if (typeof totalPatrimonio === 'number') ctx += `- Patrimônio total: ${totalPatrimonio.toLocaleString("pt-AO")} AOA\n`;
  const txs = recentTransactions as Array<{ tipo: string; valor: number; categoria: string; data_transacao: string }> | undefined;
  if (txs?.length) {
    ctx += `- Últimas transações:\n`;
    txs.slice(0, 5).forEach(t => {
      ctx += `  • ${t.tipo === "entrada" ? "+" : "-"}${Number(t.valor).toLocaleString("pt-AO")} AOA (${t.categoria}) em ${t.data_transacao}\n`;
    });
  }
  return ctx;
}

// ─── Motor nativo IK Finance AI: análise financeira com dados reais ──────────
type FinData = {
  saldoCofres?: number; totalReceitas?: number; totalDespesas?: number;
  lucroNegocios?: number; totalPatrimonio?: number;
  recentTransactions?: Array<{ tipo: string; valor: number; categoria: string; data_transacao: string }>;
};

function analyzeFinances(message: string, financialData?: Record<string, unknown>): string | null {
  if (!financialData) return null;
  const d = financialData as FinData;
  const lower = message.toLowerCase();
  const fmt = (n: number) => n.toLocaleString("pt-AO", { maximumFractionDigits: 2 }) + " AOA";
  const has = (n: unknown): n is number => typeof n === "number";

  // Visão geral / saldo / análise
  if (/saldo|quanto (tenho|possuo)|meu dinheiro|visão geral|visao geral|como estou|resumo|analis|insight|diagnóstico|diagnostico|saúde financeira|saude financeira/.test(lower)) {
    const parts: string[] = [];
    if (has(d.saldoCofres)) parts.push(`💰 Saldo nos cofres: **${fmt(d.saldoCofres)}**`);
    if (has(d.totalReceitas)) parts.push(`📈 Receitas: **${fmt(d.totalReceitas)}**`);
    if (has(d.totalDespesas)) parts.push(`📉 Despesas: **${fmt(d.totalDespesas)}**`);
    if (has(d.lucroNegocios)) parts.push(`🏢 Resultado dos negócios: **${fmt(d.lucroNegocios)}/mês**`);
    if (has(d.totalPatrimonio)) parts.push(`🏠 Patrimônio: **${fmt(d.totalPatrimonio)}**`);
    if (!parts.length) return null;
    let out = "Aqui está a sua situação financeira actual:\n\n" + parts.join("\n") + "\n";
    if (has(d.totalReceitas) && has(d.totalDespesas)) {
      const net = d.totalReceitas - d.totalDespesas;
      const ratio = d.totalReceitas > 0 ? (d.totalDespesas / d.totalReceitas) * 100 : 0;
      out += net >= 0
        ? `\n✅ Balanço positivo de **${fmt(net)}**. As despesas representam ${ratio.toFixed(0)}% das receitas${ratio > 80 ? " — atenção, margem apertada: tente mantê-las abaixo de 80%." : " — bom controlo!"}`
        : `\n⚠️ Balanço negativo de **${fmt(Math.abs(net))}**. As despesas superam as receitas — reveja as categorias de maior gasto em Relatórios e defina limites mensais.`;
    }
    return out;
  }

  // Despesas / gastos
  if (/despesa|gasto|saída|saida|onde.*gast/.test(lower) && (has(d.totalDespesas) || d.recentTransactions?.length)) {
    let out = has(d.totalDespesas)
      ? `As suas despesas totais são **${fmt(d.totalDespesas)}**.`
      : "Aqui estão os seus gastos recentes:";
    const saidas = (d.recentTransactions ?? []).filter(t => t.tipo === "saida");
    if (saidas.length) {
      const porCat = new Map<string, number>();
      saidas.forEach(t => porCat.set(t.categoria, (porCat.get(t.categoria) ?? 0) + Number(t.valor)));
      const top = [...porCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      out += "\n\nMaiores categorias recentes:\n" + top.map(([c, v]) => `• ${c}: ${fmt(v)}`).join("\n");
      out += "\n\n💡 Dica: crie um cofre com meta para controlar as categorias que mais pesam.";
    }
    return out;
  }

  // Receitas
  if (/receita|entrada|ganho|rendimento/.test(lower) && has(d.totalReceitas)) {
    let out = `As suas receitas totais são **${fmt(d.totalReceitas)}**.`;
    if (has(d.lucroNegocios) && d.lucroNegocios > 0) out += ` Os seus negócios contribuem com ${fmt(d.lucroNegocios)}/mês.`;
    out += "\n\n💡 Considere direccionar uma percentagem fixa (ex.: 20%) das receitas para um cofre de poupança.";
    return out;
  }

  // Negócios
  if (/negócio|negocio|lucro|empreendimento/.test(lower) && has(d.lucroNegocios)) {
    return d.lucroNegocios >= 0
      ? `Os seus negócios geram **${fmt(d.lucroNegocios)}/mês** de resultado líquido. ✅ Para crescer, reinvista parte do lucro e acompanhe a evolução em Relatórios.`
      : `Os seus negócios têm resultado negativo de **${fmt(Math.abs(d.lucroNegocios))}/mês**. ⚠️ Reveja as despesas mensais de cada negócio na secção Negócios e identifique onde cortar.`;
  }

  // Património
  if (/patrimônio|patrimonio|imóvel|imovel|veículo|veiculo|activo|ativo/.test(lower) && has(d.totalPatrimonio)) {
    return `O seu patrimônio total está avaliado em **${fmt(d.totalPatrimonio)}**. Mantenha os valores actuais dos activos actualizados na secção Patrimônio para acompanhar a valorização real.`;
  }

  // Últimas transações
  if (/transaç|transac|últim|ultim|histórico|historico|moviment/.test(lower) && d.recentTransactions?.length) {
    const lines = d.recentTransactions.slice(0, 5).map(t =>
      `• ${t.tipo === "entrada" ? "🟢 +" : "🔴 -"}${fmt(Number(t.valor))} — ${t.categoria} (${t.data_transacao})`);
    return "As suas transações mais recentes:\n\n" + lines.join("\n");
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load AI settings
    const { data: settings } = await adminClient
      .from("system_settings")
      .select("chave, valor")
      .in("chave", ["ai_enabled", "ai_name", "ai_persona", "ai_model", "ai_max_tokens", "ai_daily_limit", "ai_premium_limit"]);

    const cfg: Record<string, string> = {};
    (settings ?? []).forEach((s: { chave: string; valor: string }) => { cfg[s.chave] = s.valor; });
    if (cfg.ai_enabled === "false") return err("O assistente IK Finance AI está desativado.", 503);

    const aiName    = cfg.ai_name    ?? "IK Finance AI";
    const aiPersona = cfg.ai_persona ?? "Sou o IK Finance AI, assistente financeiro da plataforma IK Finance.";
    const aiModel   = cfg.ai_model   ?? "ik-native";
    const maxTokens = parseInt(cfg.ai_max_tokens ?? "1024");

    // Authenticate user
    const authHeader = req.headers.get("Authorization") ?? "";
    const userToken  = authHeader.replace("Bearer ", "");
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser(userToken);
    if (authErr || !user) return err("Não autorizado", 401);

    // Parse body
    const body = await req.json() as {
      message: string;
      history: Array<{ role: "user" | "assistant"; content: string }>;
      context: string;
      financialData?: Record<string, unknown>;
      conversationId?: string;
      file?: { name?: string; mimeType?: string; url?: string; kind?: string };
    };
    const { message, history = [], context = "geral", financialData, conversationId, file } = body;
    if (!message?.trim()) return err("Mensagem vazia");

    // Daily limit check
    const { data: profile } = await adminClient.from("user_profiles").select("plan").eq("user_id", user.id).maybeSingle();
    const userPlan   = (profile as { plan?: string } | null)?.plan ?? "free";
    const dailyLimit = userPlan === "free"
      ? parseInt(cfg.ai_daily_limit   ?? "50")
      : parseInt(cfg.ai_premium_limit ?? "500");

    const today = new Date().toISOString().split("T")[0];
    const { count } = await adminClient
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", today + "T00:00:00Z");

    if ((count ?? 0) >= dailyLimit) {
      return err(
        `Limite diário de ${dailyLimit} mensagens atingido. ${userPlan === "free" ? "Faça upgrade para Premium para mais mensagens." : "Tente novamente amanhã."}`,
        429
      );
    }

    // Build messages (usado apenas se existir OPENAI_API_KEY — opcional)
    const attachmentContext = file ? `\n\n[ANEXO RECEBIDO PARA ANÁLISE]\n- Nome: ${file.name ?? "sem nome"}\n- Tipo MIME: ${file.mimeType ?? "desconhecido"}\n- Tipo detectado: ${file.kind ?? "desconhecido"}\n- URL: ${file.url ?? "sem URL"}\n` : "";

    const systemPrompt = `${aiPersona}\n\nVocê é ${aiName}, o assistente oficial e nativo da plataforma IK Finance — criada por Inácio Kuvingua Ulundo, de Huambo, Angola.\n\nCONTEXTO ACTUAL: ${context}${attachmentContext}\n\nREGRAS:\n- Responde SEMPRE em Português (Angola/Portugal)\n- Seja direto, útil e encorajador\n- Nunca invente dados financeiros — use apenas os dados fornecidos\n- Para suporte: WhatsApp +244 943 339 350 / Inaciokuvingua@gmail.com\n- Plano activo: ${userPlan}${buildFinancialContext(financialData)}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10),
      { role: "user", content: message },
    ];

    // ─── Motor de resposta ──────────────────────────────────────────────
    // 1) IA nativa IK Finance: análise com os dados reais autorizados (primária)
    // 2) OpenAI: apenas se OPENAI_API_KEY existir (opcional, não obrigatório)
    // 3) Base de conhecimento nativa da plataforma
    let assistantMessage: string | null = analyzeFinances(message, financialData);
    let tokensIn = 0, tokensOut = 0;
    let engineUsed = "ik-native";

    if (!assistantMessage) {
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (openaiKey) {
        try {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
            body: JSON.stringify({ model: aiModel === "ik-native" ? "gpt-4o-mini" : aiModel, messages, max_tokens: maxTokens, temperature: 0.7 }),
          });
          if (res.ok) {
            const data = await res.json();
            assistantMessage = data.choices?.[0]?.message?.content ?? null;
            tokensIn  = data.usage?.prompt_tokens ?? 0;
            tokensOut = data.usage?.completion_tokens ?? 0;
            if (assistantMessage) engineUsed = aiModel;
          }
        } catch (_e) {
          // Falha externa nunca bloqueia — segue para a IA nativa
        }
      }
    }

    if (!assistantMessage) assistantMessage = getFallbackResponse(message);

    // Log usage
    await adminClient.from("ai_usage_log").insert({
      user_id: user.id, contexto: context,
      tokens_in: tokensIn, tokens_out: tokensOut, modelo: engineUsed,
    });

    // Persist conversation
    const newHistory = [...history, { role: "user", content: message }, { role: "assistant", content: assistantMessage }];
    const titulo = history.length === 0 ? message.substring(0, 60) : undefined;

    if (conversationId) {
      await adminClient
        .from("ai_conversations")
        .update({ mensagens: newHistory, updated_at: new Date().toISOString(), ...(titulo && { titulo }) })
        .eq("id", conversationId)
        .eq("user_id", user.id);
      return ok({ message: assistantMessage, conversationId });
    } else {
      const { data: conv } = await adminClient
        .from("ai_conversations")
        .insert({ user_id: user.id, titulo: titulo ?? "Conversa", mensagens: newHistory, contexto: context })
        .select("id")
        .single();
      return ok({ message: assistantMessage, conversationId: conv?.id });
    }
  } catch (e) {
    console.error("[ik-ai]", e);
    return err(String(e), 500);
  }
});
