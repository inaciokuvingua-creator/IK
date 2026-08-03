export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ExtendedAsset = {
  id: string;
  symbol: string;
  name: string;
  category: 'crypto' | 'forex' | 'stocks' | 'commodities' | 'indices';
  last_price: number;
  price_change_percent_24h: number;
  precision: number;
};

export type OrderBookLevel = {
  price: number;
  amount: number;
  total: number;
};

export type OrderBookData = {
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
  spread: number;
};

export type MarketRecentTrade = {
  id: string;
  price: number;
  amount: number;
  time: string;
  side: 'buy' | 'sell';
};

export type HistoricalScenario = {
  id: string;
  title: string;
  symbol: string;
  description: string;
  initialPrice: number;
  candles: Candle[];
};

export type PatternQuizSnippetCandle = {
  time: string;
  open: number;
  close: number;
};

export type PatternQuizItem = {
  id: string;
  title: string;
  difficulty: 'Iniciante' | 'Intermediario' | 'Avancado';
  category: string;
  patternName: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  traderTip: string;
  xpReward: number;
  candlesSnippet: PatternQuizSnippetCandle[];
};

export const MARKET_CATALOG: ExtendedAsset[] = [
  {
    id: 'btc-usdt',
    symbol: 'BTCUSDT',
    name: 'Bitcoin / Tether',
    category: 'crypto',
    last_price: 65842.35,
    price_change_percent_24h: 1.84,
    precision: 2,
  },
  {
    id: 'eth-usdt',
    symbol: 'ETHUSDT',
    name: 'Ethereum / Tether',
    category: 'crypto',
    last_price: 3420.18,
    price_change_percent_24h: -0.92,
    precision: 2,
  },
  {
    id: 'eur-usd',
    symbol: 'EURUSD',
    name: 'Euro / US Dollar',
    category: 'forex',
    last_price: 1.0874,
    price_change_percent_24h: 0.21,
    precision: 4,
  },
  {
    id: 'gbp-usd',
    symbol: 'GBPUSD',
    name: 'British Pound / US Dollar',
    category: 'forex',
    last_price: 1.2723,
    price_change_percent_24h: -0.11,
    precision: 4,
  },
  {
    id: 'aapl',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    category: 'stocks',
    last_price: 214.67,
    price_change_percent_24h: 0.74,
    precision: 2,
  },
  {
    id: 'xau-usd',
    symbol: 'XAUUSD',
    name: 'Gold Spot',
    category: 'commodities',
    last_price: 2388.5,
    price_change_percent_24h: 0.33,
    precision: 2,
  },
  {
    id: 'spx',
    symbol: 'SPX',
    name: 'S&P 500 Index',
    category: 'indices',
    last_price: 5592.4,
    price_change_percent_24h: 0.48,
    precision: 1,
  },
];

const timeframeMinutes: Record<string, number> = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
  '1h': 60,
  '4h': 240,
  '1D': 1440,
  '1W': 10080,
};

export function generateCandlesForAsset(basePrice: number, timeframe: string, count: number): Candle[] {
  const candles: Candle[] = [];
  const precision = basePrice >= 100 ? 2 : 4;
  const tfMinutes = timeframeMinutes[timeframe] ?? 60;
  const now = Date.now();

  let current = basePrice;

  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(now - i * tfMinutes * 60 * 1000);
    const open = current;

    const volatility = basePrice > 1000 ? 0.006 : 0.012;
    const drift = (Math.random() - 0.48) * volatility * open;
    const close = Math.max(0.0001, open + drift);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.35);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.35);

    candles.push({
      time: t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      open: Number(open.toFixed(precision)),
      high: Number(high.toFixed(precision)),
      low: Number(low.toFixed(precision)),
      close: Number(close.toFixed(precision)),
      volume: Math.round(120 + Math.random() * 280),
    });

    current = close;
  }

  return candles;
}

export function generateOrderBook(currentPrice: number, precision = 2): OrderBookData {
  const levels = 12;
  const tick = currentPrice >= 1000 ? 0.5 : currentPrice >= 10 ? 0.01 : 0.0001;
  const spread = tick * (2 + Math.floor(Math.random() * 3));

  const asks: OrderBookLevel[] = [];
  const bids: OrderBookLevel[] = [];

  let askTotal = 0;
  let bidTotal = 0;

  for (let i = 1; i <= levels; i++) {
    const askPrice = currentPrice + spread / 2 + tick * i;
    const bidPrice = currentPrice - spread / 2 - tick * i;

    const askAmount = Number((Math.random() * 2.8 + 0.05).toFixed(3));
    const bidAmount = Number((Math.random() * 2.8 + 0.05).toFixed(3));

    askTotal += askAmount;
    bidTotal += bidAmount;

    asks.push({
      price: Number(askPrice.toFixed(precision)),
      amount: askAmount,
      total: Number(askTotal.toFixed(3)),
    });

    bids.push({
      price: Number(bidPrice.toFixed(precision)),
      amount: bidAmount,
      total: Number(bidTotal.toFixed(3)),
    });
  }

  asks.sort((a, b) => b.price - a.price);
  bids.sort((a, b) => b.price - a.price);

  return {
    asks,
    bids,
    spread: Number(spread.toFixed(precision)),
  };
}

export const HISTORICAL_SCENARIOS: HistoricalScenario[] = [
  {
    id: 'btc-breakout',
    title: 'Rompimento de Resistancia',
    symbol: 'BTCUSDT',
    description: 'Cenario de consolidacao seguido por breakout com aumento de volume.',
    initialPrice: 42250,
    candles: generateCandlesForAsset(42250, '4h', 90),
  },
  {
    id: 'eurusd-reversal',
    title: 'Reversao em Suporte',
    symbol: 'EURUSD',
    description: 'Teste de suporte com rejeicao e retomada compradora gradual.',
    initialPrice: 1.0812,
    candles: generateCandlesForAsset(1.0812, '4h', 90),
  },
  {
    id: 'xau-pullback',
    title: 'Pullback em Tendencia',
    symbol: 'XAUUSD',
    description: 'Correcao curta em tendencia de alta com continuacao direcional.',
    initialPrice: 2315.8,
    candles: generateCandlesForAsset(2315.8, '4h', 90),
  },
];

export const PATTERN_QUIZ_DATABASE: PatternQuizItem[] = [
  {
    id: 'q1',
    title: 'Leitura de Price Action',
    difficulty: 'Iniciante',
    category: 'Candlestick',
    patternName: 'Engolfo de Alta',
    question: 'Qual leitura esta mais alinhada com o padrao apresentado?',
    options: [
      'Possivel continuacao de queda forte.',
      'Sinal de reversao para alta apos rejeicao vendedora.',
      'Mercado lateral sem contexto.',
      'Momento ideal para operar vendido.',
    ],
    correctIndex: 1,
    explanation: 'Um engolfo de alta indica predominio comprador apos absorcao da oferta vendedora.',
    traderTip: 'Confirme com volume e nivel de suporte antes da entrada.',
    xpReward: 80,
    candlesSnippet: [
      { time: '08:00', open: 102.1, close: 101.4 },
      { time: '12:00', open: 101.3, close: 102.9 },
      { time: '16:00', open: 102.8, close: 103.2 },
    ],
  },
  {
    id: 'q2',
    title: 'Estrutura de Mercado',
    difficulty: 'Intermediario',
    category: 'Suporte/Resistencia',
    patternName: 'Falso Rompimento',
    question: 'Apos romper a resistencia e voltar para baixo rapidamente, o que e mais provavel?',
    options: [
      'Breakout confirmado para cima.',
      'Armadilha compradora e retorno ao range.',
      'Inicio de tendencia de alta acelerada.',
      'Mercado sem liquidez para operar.',
    ],
    correctIndex: 1,
    explanation: 'Quando o rompimento falha e fecha dentro do range, aumenta chance de armadilha compradora.',
    traderTip: 'Evite perseguir rompimentos sem confirmacao no fechamento do candle.',
    xpReward: 120,
    candlesSnippet: [
      { time: '09:00', open: 250.2, close: 251.6 },
      { time: '10:00', open: 251.7, close: 250.3 },
      { time: '11:00', open: 250.2, close: 249.9 },
    ],
  },
  {
    id: 'q3',
    title: 'Gestao de Risco',
    difficulty: 'Avancado',
    category: 'Execucao',
    patternName: 'Tendencia com Pullback',
    question: 'Onde tende a estar a melhor entrada de risco-retorno?',
    options: [
      'No topo do movimento impulsivo.',
      'No rompimento sem stop definido.',
      'No pullback em zona de suporte com invalidacao clara.',
      'Apenas apos 4 candles de alta consecutivos.',
    ],
    correctIndex: 2,
    explanation: 'Entrar no pullback reduz distancia de stop e melhora relacao risco-retorno.',
    traderTip: 'Planeje sempre invalidacao antes de clicar em comprar/vender.',
    xpReward: 150,
    candlesSnippet: [
      { time: '13:00', open: 78.4, close: 80.1 },
      { time: '14:00', open: 80.1, close: 79.2 },
      { time: '15:00', open: 79.2, close: 80.8 },
    ],
  },
];
