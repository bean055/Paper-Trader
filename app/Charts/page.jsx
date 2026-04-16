'use client';
import React, { Suspense, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Chart } from 'react-chartjs-2';
import Navbar from "../components/Navbar";
import "../../styles/pages/charts.css"
import {
  Chart as ChartJS,
  LineController,LineElement,PointElement,LinearScale,Title,Tooltip,Legend,CategoryScale,TimeScale,Filler
} from 'chart.js';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import 'chartjs-adapter-date-fns'; 
ChartJS.register(
  LineController,LineElement,PointElement,LinearScale,CategoryScale,TimeScale,Filler,Title,Tooltip,Legend,
  CandlestickController, CandlestickElement)

export default function ChartsPage() {
  return (
    <Suspense fallback={<div className="loader">Loading Chart...</div>}>
      <ChartContent />
    </Suspense>
  );
}
function ChartContent() {
  const searchParams = useSearchParams();
  const [dualView, setDualView] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const mainCanvasRef = useRef(null);
  const [strokes, setStrokes] = useState([]);
  const currentStrokeRef = useRef([]);
  const [rulerPos, setRulerPos] = useState(null);


   const redrawAllStrokes = useCallback((strokeList) => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeList.forEach((stroke) => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = '#55bb4f';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke[0].x, stroke[0].y);
      stroke.forEach(({ x, y }) => ctx.lineTo(x, y));
      ctx.stroke();
    });
  }, []);

  const startDrawing = (e) => {
  if (activeTool !== 'draw') return;
  const canvas = mainCanvasRef.current;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  currentStrokeRef.current = [{ x, y }];
  setIsDrawing(true);
};

  const draw = (e) => {
    if (activeTool !== 'draw' || !isDrawing) return;
    const canvas = mainCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
 
    currentStrokeRef.current.push({ x, y });
    const stroke = currentStrokeRef.current;
 
    redrawAllStrokes(strokes);
    ctx.beginPath();
    ctx.strokeStyle = '#55bb4f';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(stroke[0].x, stroke[0].y);
    stroke.forEach(({ x: px, y: py }) => ctx.lineTo(px, py));
    ctx.stroke();
  };

 const stopDrawing = () => {
    if (activeTool !== 'draw' || !isDrawing) return;
    if (currentStrokeRef.current.length > 1) {
      const committed = [...strokes, [...currentStrokeRef.current]];
      setStrokes(committed);
      redrawAllStrokes(committed);
    }
    currentStrokeRef.current = [];
    setIsDrawing(false);
  };

  const clearAllDrawings = () => {
    setStrokes([]);
    const canvas = mainCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleUndo = () => {
      const updated = strokes.slice(0, -1);
      setStrokes(updated);
      redrawAllStrokes(updated);
    };

  const handleMouseMove = (e) => {
    draw(e);
    if (activeTool === 'ruler') {
      const area = mainCanvasRef.current?.parentElement;
      if (!area) return;
      const rect = area.getBoundingClientRect();
      setRulerPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };
  const handleMouseLeave = () => {
    stopDrawing();
    setRulerPos(null);
  };

  const handleScreenshot = async () => {

    const displayArea = document.querySelector('.chart-display-area');
    if (!displayArea) return;
 
    const chartCanvases = displayArea.querySelectorAll('canvas:not(.global-drawing-layer)');
    const drawingCanvas = mainCanvasRef.current;
 
    if (!chartCanvases.length) return;

    const areaRect = displayArea.getBoundingClientRect();
    const composite = document.createElement('canvas');
    composite.width = areaRect.width;
    composite.height = areaRect.height;
    const ctx = composite.getContext('2d');
 
    ctx.fillStyle = '#0d1f0f';
    ctx.fillRect(0, 0, composite.width, composite.height);
 
    chartCanvases.forEach((canvas) => {
      const rect = canvas.getBoundingClientRect();
      const offsetX = rect.left - areaRect.left;
      const offsetY = rect.top - areaRect.top;
      ctx.drawImage(canvas, offsetX, offsetY, rect.width, rect.height);
    });
 
    if (drawingCanvas) {
      ctx.drawImage(drawingCanvas, 0, 0);
    }

    composite.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        const btn = document.querySelector('.screenshot-btn');
        if (btn) {
          btn.textContent = '✓ Copied!';
          setTimeout(() => (btn.textContent = ''), 1500);
        }
      } catch (err) {
        console.error('Clipboard write failed:', err);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    }, 'image/png');
  };

  useEffect(() => {
    const syncCanvasSize = () => {
      const canvas = mainCanvasRef.current;
      if (canvas) {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        redrawAllStrokes(strokes);
      }
    };
    window.addEventListener('resize', syncCanvasSize);
    syncCanvasSize();
    return () => window.removeEventListener('resize', syncCanvasSize);
  }, [dualView, strokes, redrawAllStrokes]);

    const toggleTool = (tool) => {
    setActiveTool((prev) => (prev === tool ? 'none' : tool));
    setRulerPos(null);
  };
  const cursorStyle =
    activeTool === 'draw' ? 'crosshair'
    : activeTool === 'ruler' ? 'none'   
    : 'default';

  return (
    <div className="charts-layout">
      <Navbar />
 
      <div className="top-controls">
        <button className="control-btn" onClick={() => setDualView(!dualView)}>
          <img src="/dualView.svg" alt="second chart" />
        </button>
        <button className="control-btn" onClick={handleScreenshot} title="Copy chart to clipboard">
          <img src="/camera.svg" alt="screenshot" />
        </button>
      </div>
 
      <div className="main-view-wrapper">
        <div className="left-toolbar">
          <button
            className={`tool-btn ${activeTool === 'draw' ? 'active' : ''}`}
            onClick={() => toggleTool('draw')}
            title="Draw"
          >
            <img src="/pencil.svg" alt="pencil" />
          </button>
 
          <button
            className={`tool-btn ${activeTool === 'ruler' ? 'active' : ''}`}
            onClick={() => toggleTool('ruler')}
            title="Ruler"
          >
            <img src="/ruler.svg" alt="ruler" />
          </button>
 
          <button
            className={`tool-btn ${activeTool === 'overlay' ? 'active' : ''}`}
            onClick={() => toggleTool('overlay')}
            title="Toggle overlay"
          >
            <img src="/overlay.svg" alt="overlay" />
          </button>
 
          <button
            className="tool-btn"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            title="Undo last"
          >
            <img src="/undo.svg" alt="undo" />
          </button>
 
          <button className="tool-btn" onClick={clearAllDrawings} title="Clear all">
            <img src="/erase.svg" alt="erase" />
          </button>
        </div>
 
        <div className="chart-display-area" style={{ position: 'relative' }}>
          <div className={dualView ? 'charts-grid' : 'charts-single'}>
            <ChartContainer
              defaultSymbol={searchParams.get('symbol') || 'AAPL'}
              showOverlay={activeTool === 'overlay'}
            />
            {dualView && (
              <ChartContainer
                defaultSymbol="MSFT"
                showOverlay={activeTool === 'overlay'}
              />
            )}
          </div>
 
          <canvas
            ref={mainCanvasRef}
            className={`global-drawing-layer ${activeTool !== 'none' ? 'active' : ''}`}
            style={{ cursor: cursorStyle, position: 'absolute', top: 0, left: 0, pointerEvents: activeTool !== 'none' ? 'all' : 'none' }}
            onMouseDown={startDrawing}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDrawing}
            onMouseLeave={handleMouseLeave}
          />
          {activeTool === 'ruler' && rulerPos && (
            <div
              style={{
                position: 'absolute',
                top: 0,left: 0,
                width: '100%', height: '100%',
                pointerEvents: 'none',
                zIndex: 20,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: rulerPos.y,left: 0,
                  width: '100%',height: 1,
                  background: 'rgba(255, 230, 80, 0.85)',
                  boxShadow: '0 0 4px rgba(255, 230, 80, 0.5)',
                  transform: 'translateY(-0.5px)',
                }}
              />
              {/* Vertical line */}
              <div
                style={{
                  position: 'absolute',
                  left: rulerPos.x,top: 0,
                  width: 1,height: '100%',
                  background: 'rgba(255, 230, 80, 0.85)',
                  boxShadow: '0 0 4px rgba(255, 230, 80, 0.5)',
                  transform: 'translateX(-0.5px)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: rulerPos.x - 4,
                  top: rulerPos.y - 4,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'rgba(255, 230, 80, 1)',
                  boxShadow: '0 0 6px rgba(255, 230, 80, 0.8)',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



function ChartContainer({ defaultSymbol, showOverlay }) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [assetSymbol, setAssetSymbol] = useState("");
  const [tickerInput, setTickerInput] = useState(defaultSymbol || "");
  const [chartData, setChartData] = useState(null);
  const [timeFrame, setTimeFrame] = useState(30);
  const [chartType, setChartType] = useState('candlestick');

  const calculateMA = (data, period = 14) => {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ x: data[i].x, y: null });
        continue;
      }
      const sum = data.slice(i - period + 1, i + 1)
        .reduce((acc, d) => acc + (d.c || d.y), 0);
      result.push({ x: data[i].x, y: sum / period });
    }
    return result;
  };

  const fetchStockHistory = useCallback(async () => {
    if (!symbol) return;

    try {
      const response = await fetch(`/api/portfolio/price-History?timeframe=${timeFrame}&asset_symbol=${symbol}`);
      
      if (!response.ok) throw new Error("Network response error");
      
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        setAssetSymbol(data[0].asset_symbol || symbol);

        const isCandle = chartType === 'candlestick';

        const priceData = data.map(d => ({
          x: new Date(d.date).getTime(),
          ...(isCandle 
            ? { o: d.open, h: d.high, l: d.low, c: d.close } 
            : { y: d.close })
        }));

        const datasets = [{
          label: symbol,
          data: priceData,
          color: {
            up: '#6FFF67',
            down: '#FF9494',
            unchanged: '#ffffff',
          },
          borderColor: '#31c969',
          backgroundColor: 'rgba(49, 201, 105, 0.1)',
          fill: !isCandle,
          tension: 0.3,
          pointRadius: 0,
          order: 2
        }];

        if (showOverlay) {
          const ma20Data = calculateMA(priceData, 20);
          datasets.push({
            label: 'MA20',
            type: 'line',
            data: ma20Data,
            borderColor: 'rgba(255, 165, 0, 0.8)',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.3,
            order: 1
          });
        }

        setChartData({ datasets });
      }
    } catch (err) {
      console.error("Chart Fetch Error:", err);
      setChartData(null); 
    }
  }, [symbol, timeFrame, chartType, showOverlay]);

  useEffect(() => {
    fetchStockHistory();
  }, [fetchStockHistory]);


  return (
    <div className="individual-chart-box">
     <div className="chart-header">

      <div className="chart-controls-row">
        <div className="toggle-group">
          <button 
            className={`toggle-btn ${chartType === 'candlestick' ? 'active' : ''}`}
            onClick={() => setChartType('candlestick')}
          >
            Candles
          </button>
          <button 
            className={`toggle-btn ${chartType === 'line' ? 'active' : ''}`}
            onClick={() => setChartType('line')}
          >
            Line
          </button>
        </div>

        <div className="search-wrapper">
          <input 
            type="text" 
            placeholder="Ticker..." 
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSymbol(tickerInput.toUpperCase())}
          />
        </div>

        <div className="toggle-group">
          {[7, 30, 90, 180].map((tf) => (
            <button
              key={tf}
              className={`toggle-btn ${timeFrame === tf ? 'active' : ''}`}
              onClick={() => setTimeFrame(tf)}
            >
              {tf === 180 ? 'ALL' : `${tf}D`}
            </button>
          ))}
        </div>
      </div>
    </div>
      
      <div className="chart-render-area">
        {chartData ? (
          <Chart 
            type={chartType} 
            data={chartData} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              layout: {
                padding: 0 
              },
              scales: {
                x: {
                  type: 'time',
                  time: { unit: 'day' },
                  grid: { display: false },
                  ticks: { 
                    color: '#4a5d45',
                    maxRotation: 0,
                    autoSkip: true 
                  },
                  bounds: 'data' 
                },
                y: {
                  position: 'right',
                  grid: { color: 'rgba(74, 93, 69, 0.2)' },
                  ticks: { color: '#4a5d45' },
                  grace: '25%' 
                }
              },
              plugins: {
                legend: { display: false },
                tooltip: { enabled: true, mode: 'index', intersect: false }
              }
            }}
          />
        ) : (
          <div className="loader">Loading market data...</div>
        )}
      </div>
    </div>
  );
}