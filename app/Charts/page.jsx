'use client';
import React, { Suspense, useEffect, useRef, useState, useCallback } from 'react';
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

  const [isDrawing, setIsDrawing] = useState(false);
  const mainCanvasRef = useRef(null);
  const [strokes, setStroke] = useState([]);

  const startDrawing = (e) => {
    if (!isDrawingMode) return;
    const canvas = mainCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#55bb4f'; 
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !isDrawingMode) return;
    const canvas = mainCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearAllDrawings = () => {
    const canvas = mainCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    const syncCanvasSize = () => {
      const canvas = mainCanvasRef.current;
      if (canvas) {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    window.addEventListener('resize', syncCanvasSize);
    syncCanvasSize(); 
    return () => window.removeEventListener('resize', syncCanvasSize);
  }, [dualView]); 

  return (
    <div className="charts-layout">
      <Navbar /> 
      <div className="top-controls">
        <button className="view-btn" onClick={() => setDualView(!dualView)}>
          {dualView ? "Disable Dual View" : "Enable Dual View"}
        </button>
        <div className='control-btns'>
          <button className="control-btn">
              <img src="/camera.svg" />
          </button>
          <button className="control-btn" >
            <img src="/configure.svg" />
          </button>
        </div>
      </div>

      <div className="main-view-wrapper">
        <div className="left-toolbar">
          <button className={`tool-btn ${isDrawingMode ? 'active' : ''}`}
            onClick={() => setIsDrawingMode(!isDrawingMode)}>
            <img src="/pencil.svg" alt="pencil"  />
          </button>
          <button className="tool-btn">
            <img src="/ruler.svg" />
          </button>
          <button className="tool-btn">
            <img src="/overlay.svg" />
          </button>
          <button className="tool-btn">
            <img src="/undo.svg" />
          </button>
          <button className="tool-btn" onClick={clearAllDrawings}>
            <img src="/erase.svg" />
          </button>
        </div>

        <div className="chart-display-area">
          <div className={dualView ? "charts-grid" : "charts-single"}>
            <ChartContainer 
              defaultSymbol={searchParams.get('symbol') || "AAPL"} 
              isDrawingMode={isDrawingMode}
            />
            {dualView && (
              <ChartContainer 
                defaultSymbol="MSFT" 
                isDrawingMode={isDrawingMode}
              />
            )}
          </div>

          <canvas 
            ref={mainCanvasRef}
            className={`global-drawing-layer ${isDrawingMode ? 'active' : ''}`}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
      </div>
    </div>
  );
}


function ChartContainer({ defaultSymbol}) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [assetSymbol, setAssetSymbol] = useState("");
  const [tickerInput, setTickerInput] = useState(defaultSymbol || "");
  const [chartData, setChartData] = useState(null);
  const [timeFrame, setTimeFrame] = useState(30);
  const [chartType, setChartType] = useState('candlestick');

 const fetchStockHistory = useCallback(async () => {
    if (!symbol) return;

    try {
      const response = await fetch(`/api/portfolio/price-History?timeframe=${timeFrame}&asset_symbol=${symbol}`);
      
      if (!response.ok) throw new Error("Network response was not ok");
      
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        setAssetSymbol(data[0].asset_symbol || symbol);

        const isCandle = chartType === 'candlestick';

        setChartData({
          datasets: [{
            label: symbol,
            data: data.map(d => ({
              x: new Date(d.date).getTime(),
              ...(isCandle 
                ? { o: d.open, h: d.high, l: d.low, c: d.close } 
                : { y: d.close })
            })),
            color: {
              up: '#6FFF67',
              down: '#FF9494',
              unchanged: '#ffffff',
            },
            borderColor: '#31c969',
            backgroundColor: 'rgba(49, 201, 105, 0.1)',
            fill: !isCandle,
            tension: 0.3,
            pointRadius: 0
          }]
        });
      }
    } catch (err) {
      console.error("Chart Fetch Error:", err);
      setChartData(null); 
    }
  }, [symbol, timeFrame, chartType]);

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