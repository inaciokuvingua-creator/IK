import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { asset_symbol, type, external_context } = await req.json()

    const exchangeRates = {
      'USD/BRL': 5.42,
      'EUR/USD': 1.08,
      'BTC/USD': 64250.00,
      'ETH/USD': 3450.00
    };

    const news = [
      {
        title: `Movimentação institucional em ${asset_symbol} detectada`,
        source: "Reuters Finance",
        sentiment: "Bullish",
        time: new Date().toISOString()
      },
      {
        title: "Novas regulamentações podem afetar o setor",
        source: "Bloomberg",
        sentiment: "Neutral",
        time: new Date(Date.now() - 3600000).toISOString()
      }
    ];

    const externalIntelligence = external_context ? 
      `Análise agregada de fontes externas sugere: ${external_context}` : 
      "Nenhuma inteligência externa adicional fornecida para este ativo.";

    // 1. Geração de Mentoria Didática
    const mentorExplanation = `
      Vamos aprender com o ${asset_symbol}. O RSI está em 65.8, o que indica que os compradores estão dominando, mas ainda há espaço antes de o mercado ficar 'cansado' (acima de 70). 
      O padrão 'Cup and Handle' que vemos é como uma xícara: o mercado caiu, formou um fundo arredondado e agora está criando a 'asa' para romper a resistência. 
      Em termos simples: o mercado está acumulando energia para um salto.
    `;

    const analysis = {
      asset: asset_symbol,
      timestamp: new Date().toISOString(),
      exchange_context: {
        rates: exchangeRates,
        base_currency: "USD",
        market_status: "OPEN"
      },
      technical: {
        rsi: 65.8,
        macd: "Fortalecimento de tendência",
        moving_averages: "Golden Cross confirmada no gráfico de 4h",
        signals: ["Forte pressão de compra", "Rompimento de resistência chave"]
      },
      patterns: ["Cup and Handle", "Bull Flag"],
      sentiment: {
        score: 0.82,
        label: "Strong Bullish",
        news_summary: "O mercado está otimista devido à forte acumulação e notícias positivas de fontes institucionais.",
        recent_news: news
      },
      mentor: {
        didactic_explanation: mentorExplanation,
        key_concept: "Continuação de Tendência",
        pro_tip: "Observe o volume no rompimento da 'asa' da xícara para confirmar a entrada."
      },
      external_intel: {
        summary: externalIntelligence,
        aggregated_sources: ["IK Finance AI", "Market Data Feed", "External Analytics"]
      },
      predictions: {
        optimistic: { target: "+7.5%", probability: 0.35 },
        neutral: { target: "+1.2%", probability: 0.45 },
        pessimistic: { target: "-2.5%", probability: 0.20 },
        explanation: `Considerando o câmbio atual (USD/BRL: ${exchangeRates['USD/BRL']}), a convergência de dados técnicos e sentimento de mercado altamente positivo indica uma alta probabilidade de continuação da tendência de alta. ${externalIntelligence}`
      }
    }

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
