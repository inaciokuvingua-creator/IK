import { useRef, useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  Maximize2,
  RefreshCw,
  Eye,
  Sliders,
  Crosshair,
  Pencil,
  Zap
} from 'lucide-react';
import type { Candle } from '../../lib/tradingSimulationData';

interface CandlestickChartCanvasProps {
  symbol: string;
  price: number;
  candles: Candle[];
  timeframe: string;
  enabledIndicators: string[];
  onTimeframeChange?: (tf: string) => void;
  onToggleIndicator?: (ind: string) => void;
  isReplayMode?: boolean;
  onNextReplayCandle?: () => void;
  replayStep?: number;
  totalReplayCandles?: number;
}

export default function CandlestickChartCanvas({
  symbol,
  price,
  candles,
  timeframe,
  enabledIndicators,
  onTimeframeChange,
  onToggleIndicator,
  isReplayMode = false,
  onNextReplayCandle,
  replayStep = 0,
  totalReplayCandles = 0,
}: CandlestickChartCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [activeTool, setActiveTool] = useState<'crosshair' | 'line' | 'position'>('crosshair');
  const [drawnLines, setDrawnLines] = useState<{ yPrice: number; color: string }[]>([]);

  const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];
  const INDICATORS = ['MA20', 'MA50', 'EMA9', 'RSI', 'MACD', 'Bollinger', 'Volume', 'S/R'];

  // Cálculo dos indicadores
  const indicatorsData = useMemo(() => {
    if (!candles || candles.length === 0) return null;

    const closes = candles.map(c => c.close);
    const count = candles.length;

    // Moving Average 20
    const ma20: (number | null)[] = [];
    for (let i = 0; i < count; i++) {
      if (i < 19) ma20.push(null);
      else {
        const sum = closes.slice(i - 19, i + 1).reduce((a, b) => a + b, 0);
        ma20.push(sum / 20);
      }
    }

    // Moving Average 50
    const ma50: (number | null)[] = [];
    for (let i = 0; i < count; i++) {
      if (i < 49) ma50.push(null);
      else {
        const sum = closes.slice(i - 49, i + 1).reduce((a, b) => a + b, 0);
        ma50.push(sum / 50);
      }
    }

    // RSI 14
    const rsi: (number | null)[] = [];
    let gains = 0;
    let losses = 0;
    for (let i = 1; i < count; i++) {
      const diff = closes[i] - closes[i - 1];
      if (i <= 14) {
        if (diff >= 0) gains += diff;
        else losses -= diff;
        if (i === 14) {
          const avgGain = gains / 14;
          const avgLoss = losses / 14;
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          rsi.push(100 - 100 / (1 + rs));
        } else {
          rsi.push(null);
        }
      } else {
        const prevRsi = rsi[rsi.length - 1];
        if (prevRsi === null) {
          rsi.push(50);
        } else {
          const currentGain = diff > 0 ? diff : 0;
          const currentLoss = diff < 0 ? -diff : 0;
          gains = (gains * 13 + currentGain) / 14;
          losses = (losses * 13 + currentLoss) / 14;
          const rs = losses === 0 ? 100 : gains / losses;
          rsi.push(100 - 100 / (1 + rs));
        }
      }
    }
    // padding do primeiro candle
    rsi.unshift(null);

    // Support and Resistance Levels (Mínimas e Máximas locais)
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const highest = Math.max(...highs);
    const lowest = Math.min(...lows);
    const midPoint = (highest + lowest) / 2;

    const supportLevel = Number((lowest + (midPoint - lowest) * 0.4).toFixed(price > 100 ? 2 : 4));
    const resistanceLevel = Number((highest - (highest - midPoint) * 0.3).toFixed(price > 100 ? 2 : 4));

    return { ma20, ma50, rsi, highest, lowest, supportLevel, resistanceLevel };
  }, [candles, price]);

  // Renderização do Gráfico no Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !candles || candles.length === 0) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height || 360;

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, width, height);

    // Layout das áreas
    const paddingRight = 65; // Eixo de preço
    const paddingBottom = enabledIndicators.includes('RSI') ? 80 : 30; // Eixo de tempo e Sub-chart RSI
    const chartWidth = width - paddingRight;
    const chartHeight = height - paddingBottom;

    // Calcular min/max de preço visível
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    let minPrice = Math.min(...lows);
    let maxPrice = Math.max(...highs);

    if (indicatorsData?.supportLevel && enabledIndicators.includes('S/R')) {
      minPrice = Math.min(minPrice, indicatorsData.supportLevel);
      maxPrice = Math.max(maxPrice, indicatorsData.resistanceLevel);
    }

    const priceRange = maxPrice - minPrice || 1;
    const candleCount = candles.length;
    const candleSlotWidth = chartWidth / candleCount;
    const candleWidth = Math.max(2, candleSlotWidth * 0.7);

    // Função auxiliar para mapear Preço -> Coordenada Y
    const priceToY = (p: number) => {
      return chartHeight - ((p - minPrice) / priceRange) * (chartHeight - 20) - 10;
    };

    // 1. Linhas de Grade (Grid Lines)
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    const priceSteps = 5;
    for (let i = 0; i <= priceSteps; i++) {
      const p = minPrice + (priceRange / priceSteps) * i;
      const y = priceToY(p);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Rótulo do Preço no eixo direito
      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.font = '10px monospace';
      ctx.fillText(
        p >= 1000 ? p.toFixed(2) : p.toFixed(4),
        chartWidth + 6,
        y + 3
      );
    }
    ctx.setLineDash([]);

    // 2. Linhas de Suporte & Resistência (S/R)
    if (enabledIndicators.includes('S/R') && indicatorsData) {
      // Suporte (Verde Esmeralda)
      const supY = priceToY(indicatorsData.supportLevel);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, supY);
      ctx.lineTo(chartWidth, supY);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.fillText(`SUP ${indicatorsData.supportLevel}`, 10, supY - 4);

      // Resistência (Vermelho)
      const resY = priceToY(indicatorsData.resistanceLevel);
      ctx.strokeStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(0, resY);
      ctx.lineTo(chartWidth, resY);
      ctx.stroke();

      ctx.fillStyle = '#f43f5e';
      ctx.fillText(`RES ${indicatorsData.resistanceLevel}`, 10, resY - 4);
      ctx.setLineDash([]);
    }

    // 3. Desenho dos Candlesticks (Velas OHLCV)
    candles.forEach((c, i) => {
      const x = i * candleSlotWidth + candleSlotWidth / 2;
      const isGreen = c.close >= c.open;
      const color = isGreen ? '#10b981' : '#f43f5e'; // emerald vs rose

      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);

      // Pavio (Wick)
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Corpo (Body)
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(openY - closeY));
      ctx.fillStyle = color;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      // Histograma de Volume no Fundo do Gráfico
      if (enabledIndicators.includes('Volume')) {
        const maxVol = Math.max(...candles.map(v => v.volume)) || 1;
        const volHeight = (c.volume / maxVol) * 45;
        ctx.fillStyle = isGreen ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.18)';
        ctx.fillRect(x - candleWidth / 2, chartHeight - volHeight, candleWidth, volHeight);
      }
    });

    // 4. Desenhar Médias Móveis (MA20 & MA50)
    if (enabledIndicators.includes('MA20') && indicatorsData?.ma20) {
      ctx.strokeStyle = '#38bdf8'; // sky-400
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      indicatorsData.ma20.forEach((val, i) => {
        if (val !== null) {
          const x = i * candleSlotWidth + candleSlotWidth / 2;
          const y = priceToY(val);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else { ctx.lineTo(x, y); }
        }
      });
      ctx.stroke();
    }

    if (enabledIndicators.includes('MA50') && indicatorsData?.ma50) {
      ctx.strokeStyle = '#a855f7'; // purple-500
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      indicatorsData.ma50.forEach((val, i) => {
        if (val !== null) {
          const x = i * candleSlotWidth + candleSlotWidth / 2;
          const y = priceToY(val);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else { ctx.lineTo(x, y); }
        }
      });
      ctx.stroke();
    }

    // 5. Linhas de preço personalizadas desenhadas pelo utilizador
    drawnLines.forEach(line => {
      const y = priceToY(line.yPrice);
      if (y >= 0 && y <= chartHeight) {
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // 6. Sub-gráfico do Indicador RSI
    if (enabledIndicators.includes('RSI') && indicatorsData?.rsi) {
      const rsiTop = chartHeight + 10;
      const rsiHeight = 60;

      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, rsiTop, chartWidth, rsiHeight);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(0, rsiTop, chartWidth, rsiHeight);

      // Zonas de Sobrecompra (70) e Sobrevenda (30)
      const rsiY = (val: number) => rsiTop + rsiHeight - (val / 100) * rsiHeight;

      ctx.strokeStyle = 'rgba(244,63,94,0.4)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(0, rsiY(70));
      ctx.lineTo(chartWidth, rsiY(70));
      ctx.stroke();

      ctx.strokeStyle = 'rgba(16,185,129,0.4)';
      ctx.beginPath();
      ctx.moveTo(0, rsiY(30));
      ctx.lineTo(chartWidth, rsiY(30));
      ctx.stroke();
      ctx.setLineDash([]);

      // Linha RSI
      ctx.strokeStyle = '#f59e0b'; // amber-500
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      indicatorsData.rsi.forEach((val, i) => {
        if (val !== null) {
          const x = i * candleSlotWidth + candleSlotWidth / 2;
          const y = rsiY(val);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else { ctx.lineTo(x, y); }
        }
      });
      ctx.stroke();

      // Rótulo RSI
      ctx.fillStyle = '#f59e0b';
      ctx.font = '10px sans-serif';
      ctx.fillText(`RSI (14)`, 8, rsiTop + 14);
    }

    // 7. Mira Laser / Crosshair + Preço Flutuante
    if (mousePos && mousePos.x <= chartWidth && mousePos.y <= chartHeight) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Linha Vertical
      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, chartHeight);
      ctx.stroke();

      // Linha Horizontal
      ctx.beginPath();
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(chartWidth, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Preço na Posição do Cursor
      const hoveredPrice = minPrice + ((chartHeight - mousePos.y - 10) / (chartHeight - 20)) * priceRange;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(chartWidth + 2, mousePos.y - 10, paddingRight - 4, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(hoveredPrice >= 1000 ? hoveredPrice.toFixed(2) : hoveredPrice.toFixed(4), chartWidth + 6, mousePos.y + 3);
    }

  }, [candles, enabledIndicators, indicatorsData, mousePos, drawnLines]);

  // Captura de eventos do mouse no Canvas
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !candles || candles.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    const chartWidth = rect.width - 65;
    const candleSlotWidth = chartWidth / candles.length;
    const index = Math.floor(x / candleSlotWidth);

    if (index >= 0 && index < candles.length) {
      setHoveredCandle(candles[index]);
    } else {
      setHoveredCandle(null);
    }
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setHoveredCandle(null);
  };

  const handleCanvasClick = () => {
    if (activeTool === 'line' && mousePos && containerRef.current && candles.length > 0) {
      const rect = containerRef.current.getBoundingClientRect();
      const chartHeight = (rect.height || 360) - (enabledIndicators.includes('RSI') ? 80 : 30);
      const highs = candles.map(c => c.high);
      const lows = candles.map(c => c.low);
      const minPrice = Math.min(...lows);
      const maxPrice = Math.max(...highs);
      const priceRange = maxPrice - minPrice || 1;

      const clickedPrice = minPrice + ((chartHeight - mousePos.y - 10) / (chartHeight - 20)) * priceRange;
      setDrawnLines(prev => [...prev, { yPrice: Number(clickedPrice.toFixed(price > 100 ? 2 : 4)), color: '#f59e0b' }]);
    }
  };

  const activeCandleDisplay = hoveredCandle || (candles.length > 0 ? candles[candles.length - 1] : null);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-2xl">
      {/* Topo do Gráfico: Símbolo + Preço Atual + Controles de Timeframe */}
      <div className="flex flex-col gap-3 border-b border-slate-800 p-4 lg:flex-row lg:items-center lg:justify-between bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white font-mono tracking-wide">{symbol}</span>
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                PRO TERMINAL
              </span>
            </div>
            {activeCandleDisplay && (
              <div className="flex flex-wrap gap-3 text-xs font-mono text-slate-400 mt-0.5">
                <span>O: <strong className="text-slate-200">{activeCandleDisplay.open}</strong></span>
                <span>H: <strong className="text-emerald-400">{activeCandleDisplay.high}</strong></span>
                <span>L: <strong className="text-rose-400">{activeCandleDisplay.low}</strong></span>
                <span>C: <strong className="text-slate-200">{activeCandleDisplay.close}</strong></span>
                <span>Vol: <strong className="text-slate-300">{(activeCandleDisplay.volume / 1000).toFixed(0)}k</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Botoes de Intervalo de Tempo */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => onTimeframeChange?.(tf)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold font-mono transition-all ${
                timeframe === tf
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Bar de Ferramentas e Indicadores Táticos */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/60 px-4 py-2 text-xs">
        {/* Toggle de Indicadores */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 font-medium flex items-center gap-1 mr-1">
            <Sliders size={13} /> Indicadores:
          </span>
          {INDICATORS.map(ind => {
            const isEnabled = enabledIndicators.includes(ind);
            return (
              <button
                key={ind}
                onClick={() => onToggleIndicator?.(ind)}
                className={`rounded-md border px-2.5 py-1 font-mono transition-all ${
                  isEnabled
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300 shadow-sm'
                    : 'border-slate-800 bg-slate-950/40 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                {ind}
              </button>
            );
          })}
        </div>

        {/* Ferramentas de Desenho */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTool(activeTool === 'line' ? 'crosshair' : 'line')}
            className={`flex items-center gap-1 rounded-md border px-2.5 py-1 transition-all ${
              activeTool === 'line'
                ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
            title="Clique no gráfico para desenhar uma linha de preço chave"
          >
            <Pencil size={12} /> Desenhar Linha S/R
          </button>
          {drawnLines.length > 0 && (
            <button
              onClick={() => setDrawnLines([])}
              className="text-slate-500 hover:text-rose-400 transition-colors text-[11px]"
            >
              Limpar ({drawnLines.length})
            </button>
          )}
        </div>
      </div>

      {/* Área Principal do Gráfico Canvas */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleCanvasClick}
        className="relative h-88 w-full bg-[#070b14] cursor-crosshair overflow-hidden"
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* Banner de Modo Replay Histórico */}
        {isReplayMode && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-3 rounded-xl border border-amber-500/40 bg-slate-950/90 px-3.5 py-2 backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
              <Zap size={14} className="animate-pulse" /> MODO REPLAY HISTÓRICO
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Vela {replayStep} / {totalReplayCandles}
            </div>
            <button
              onClick={onNextReplayCandle}
              className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20"
            >
              Avançar Vela +1
            </button>
          </div>
        )}

        {/* Legenda de Indicadores Ativos no Canto Inferior Esquerdo */}
        <div className="absolute bottom-2 left-3 z-10 flex flex-wrap gap-3 text-[11px] font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800">
          {enabledIndicators.includes('MA20') && <span className="text-sky-400">MA20</span>}
          {enabledIndicators.includes('MA50') && <span className="text-purple-400">MA50</span>}
          {enabledIndicators.includes('RSI') && <span className="text-amber-400">RSI(14)</span>}
          {enabledIndicators.includes('S/R') && <span className="text-emerald-400">S/R Auto</span>}
          <span className="text-slate-500">Live Tick Engine</span>
        </div>
      </div>
    </div>
  );
}
