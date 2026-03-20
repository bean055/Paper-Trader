'use client';
import "../../styles/pages/portfolio.css"
import Navbar from "../components/Navbar"
import "../../styles/global.css";
import {useEffect, useState } from "react";

import { useRouter} from "next/navigation";

import { Chart as ChartJS, TimeScale, LinearScale, Tooltip, PointElement, LineController,LineElement } from 'chart.js';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import { Chart } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(TimeScale, LinearScale, Tooltip, CandlestickController, CandlestickElement,
  PointElement, LineElement, LineController);

export default function Portfolio() {
  const[portfolio, setPortfolio] = useState(null)
  const[holdings , setHoldings] = useState([])
  const[error, setError] = useState(null)
  const[selectedStock, setSelectedStock] = useState (null)

  const [moverFilter, setMoverFilter] = useState("up"); 
  const topMovers = [...holdings]
    .sort((a, b) => {
      const pnlPercentA = (Number(a.unrealised_pnl) / (Number(a.quantity) * Number(a.average_entry_price)));
      const pnlPercentB = (Number(b.unrealised_pnl) / (Number(b.quantity) * Number(b.average_entry_price)));
      
      return moverFilter === "up" ? pnlPercentB - pnlPercentA : pnlPercentA - pnlPercentB;
    })
    .slice(0, 5);

    const [chartHistory, setChartHistory] = useState([]);
    const [timeFrame, setTimeFrame] = useState(7);
    const [chartMode, setChartMode] = useState("balance");

    const [assetHistory, setAssetHistory] = useState([]);
    const [assetTimeframe, setAssetTimeframe] = useState(30);
    const [assetMode, setAssetMode] = useState('price'); 
    const [assetChartType, setAssetChartType] = useState('candlestick');
      const router = useRouter();

  const fetchPortfolio = async () => {
    try {
      const response = await fetch("/api/portfolio", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch portfolio");

      const data = await response.json();
      setPortfolio(data.portfolio);

      const rawHoldings = data.holdings || [];
      
      const totalValue = rawHoldings.reduce((sum, h) => sum + Number(h.market_value || 0), 0);

      const holdingsWithExposure = rawHoldings.map(h => ({
        ...h, 
        exposure: totalValue > 0 
          ? ((Number(h.market_value) / totalValue) * 100).toFixed(2) 
          : "0.00"
      }));

      setHoldings(holdingsWithExposure);
    } catch (err) {
      setError(err.message);
    } 
  };

 const fetchHistory = async (days = timeFrame) => {
    try {
      const response = await fetch(`/api/portfolio/history?timeframe=${days}`, { 
        credentials: "include" 
      });
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();
      
      const formatted = data.map((day) => ({
        x: new Date(day.recorded_at).getTime(),
        y: Number(day.equity_point || 0),
        cash: Number(day.balance_point || 0)
      }));
      
      setChartHistory(formatted);
    } catch (err) {
      setError(err.message);
    }
  };  

  const fetchStockHistory = async (stockId, days = assetTimeframe) => {
    if (!stockId) return;
    try {
      const response = await fetch(`/api/portfolio/price-History?timeframe=${days}&stock_id=${stockId}`, { 
        credentials: "include" 
      });
      const data = await response.json();
      
      const qty = Number(selectedStock?.quantity || 0);

      const formatted = data.map((day) => ({
        x: new Date(day.date).getTime(),
        o: assetMode === 'price' ? day.open : day.open * qty,
        h: assetMode === 'price' ? day.high : day.high * qty,
        l: assetMode === 'price' ? day.low : day.low * qty,
        c: assetMode === 'price' ? day.close : day.close * qty,
      }));

      setAssetHistory(formatted);
    } catch (err) {
      console.error("Asset history error:", err);
    }
  };


  useEffect(() => {
    fetchPortfolio(timeFrame);
    fetchHistory(timeFrame);
  }, [timeFrame]);
  
  useEffect(() => {
    if (selectedStock?.stock_id) {
      fetchStockHistory(selectedStock.stock_id, assetTimeframe);
    }
  }, [selectedStock?.stock_id, assetTimeframe]);

  const linkToChart = (stock_id) => {
    router.push(`/chart?stock_id=${stock_id}`);
  };


  const getPnL = (value) => (value >= 0 ? "positive" : "negative");

  const currentBalance = Number(portfolio?.balance || 0);

  const startingPoint = chartHistory.length > 0 
    ? Number(chartHistory[0].cash || 0) 
    : 1000; 

  const timeframeDollarReturn = currentBalance - startingPoint;
  const timeframePercentageReturn = startingPoint !== 0 
    ? ((currentBalance / startingPoint) - 1) * 100 
    : 0;

  return (
    <>
    <Navbar/>
    <div className="portfolio-page">

      <div className="portfolio-stats">
        <div className="portfolio-stats-chart">
          <div className="chart-controls">
            <div className="selector">
              <button className={timeFrame === 7 ? "active" : ""} onClick={() => setTimeFrame(7)}>7D</button>
              <button className={timeFrame === 30 ? "active" : ""} onClick={() => setTimeFrame(30)}>30D</button>
              <button className={timeFrame === 90 ? "active" : ""} onClick={() => setTimeFrame(90)}>90D</button>
              <button className={timeFrame === 180 ? "active" : ""} onClick={() => setTimeFrame(180)}>ALL</button>
            </div>
            <div className="selector">
              <button className={chartMode === 'equity' ? "active" : ""} onClick={() => setChartMode('equity')}>Equity</button>
              <button className={chartMode === 'balance' ? "active" : ""} onClick={() => setChartMode('balance')}>Cash</button>
            </div>
          </div>
          
          <div className="chart-container-main">
            {chartHistory.length > 0 ? (
              <Chart
                key={`${timeFrame}-${chartMode}`}
                type="line" 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: {
                      type: 'time',
                      time: { unit: 'day' },
                      grid: { display: false },
                      ticks: { color: '#878787' }
                    },
                    y: {
                      grid: { color: 'rgba(255, 255, 255, 0.1)' },
                      ticks: { callback: (val) => `$${Number(val).toLocaleString()}` }
                    }
                  }
                }}
                data={{
                  datasets: [
                    {
                      label: chartMode === 'equity' ? 'Portfolio Equity' : 'Cash Balance',
                      data: chartHistory.map(d => ({ 
                        x: d.x, 
                        y: chartMode === 'equity' ? d.y : d.cash 
                      })),
                      borderColor: chartMode === 'equity' ? '#6FFF67' : '#ffffff',
                      borderWidth: 2,
                      pointRadius: 0,
                      fill: true,
                      backgroundColor: chartMode === 'equity' 
                        ? 'rgba(111, 255, 103, 0.1)' 
                        : 'rgba(255, 255, 255, 0.1)',
                      tension: 0.4 
                    }
                  ]
                }}
              />
            ) : (
              <div className="chart-loader"><p>Fetching market history...</p></div>
            )}
          </div>
        </div>
        <div className="portfolio-statboxes">
          <div className="portfolio-chart">
            
          </div>
          <div className="stat-box">
              <span>TOTAL VALUE</span>
              <h2>${Number(portfolio?.total_value || 0).toFixed(2)}</h2>
          </div>
          <div className="stat-box">
              <span>CASH BALANCE</span>
              <h2>${Number(portfolio?.balance || 0).toFixed(2)}</h2>
          </div>
          <div className="stat-box">
              <span>PORTFOLIO VALUE</span>
              <h2>${Number(portfolio?.equity || 0).toFixed(2)}</h2>
          </div>
          <div className="stat-box">
              <span>EXPOSURE</span>
              <h2>{Number(portfolio?.risk_exposure || 0).toFixed(2)}%</h2>
          </div>
          <div className="stat-box">
            <span>{timeFrame}D TOTAL RETURN</span>
            <h2 className={getPnL(timeframeDollarReturn)}>
              {timeframeDollarReturn >= 0 ? "+" : ""}${timeframeDollarReturn.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </h2>
            <small className={getPnL(timeframePercentageReturn)} style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
              {timeframePercentageReturn >= 0 ? "+" : ""}{timeframePercentageReturn.toFixed(2)}%
            </small>
        </div>
        </div>
      </div>

      <div className="asset-info">
      {selectedStock ? (
        <>
          <div className="info-panel">
            <div className="info-header">
              <div className="top-row">
                <h1 className="info-symbol">{selectedStock.asset_symbol}</h1>
              <button className="chart-link" onClick={() => linkToChart(selectedStock.asset_symbol)}>
                  <img src={"chart-link.png"}></img>
              </button>     
              </div>
              <p className="info-name">{selectedStock.asset_name}</p>
            </div>
            
              <div className="year-range">
                <label>52 Week Range</label>
                <p>L: ${Number(selectedStock.low_52).toFixed(2)} - H: ${Number(selectedStock.high_52).toFixed(2)}</p>
              </div>

            
            <div className="info-grid">
              <div className="info-stat">
                <label>CURRENT PRICE</label>
                <p>${Number(selectedStock.current_price).toFixed(2)}</p>
              </div>
              <div className="info-stat">
                <label>SHARES</label>
                <p>{selectedStock.quantity}</p>
              </div>
              <div className="info-stat">
                <label>MARKET VALUE</label>
                <p>${Number(selectedStock.market_value).toFixed(2)}</p>
              </div>
              <div className="info-stat">
                <label>P/E RATIO</label>
                <p>{Number(selectedStock.pe_ratio).toFixed(2) || "N/A"}</p>
              </div>
              <div className="info-stat">
                <label>DIV YIELD</label>
                <p>{Number(selectedStock.dividend_yield).toFixed(2) || "N/A"}%</p>
              </div>
              <div className="info-stat">
                <label>EPS</label>
                <p>${Number(selectedStock.eps).toFixed(2)}</p>
              </div>
              <div className="info-stat">
              <label>Market Cap</label>
              <p>
                {selectedStock.market_cap ? (
                  (() => {
                    const val = Number(selectedStock.market_cap);
                    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
                    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
                    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
                    return `$${val.toLocaleString()}`;
                  })()
                ) : (
                  "N/A"
                )}
              </p>
            </div>          
            </div>          
          </div>

          <div className="asset-chart">
            <div className="asset-chart-header">
              <div className="selector">
                {[7, 30, 60, 90, 180].map(d => (
                  <button 
                    key={d} 
                    className={assetTimeframe === d ? "active" : ""} 
                    onClick={() => setAssetTimeframe(d)}
                  >
                    {d === 180 ? 'ALL' : `${d}D`}
                  </button>
                ))}
              </div>
              <div className="selector">
                <button className={assetChartType === 'candlestick' ? "active" : ""} onClick={() => setAssetChartType('candlestick')}>Candle</button>
                <button className={assetChartType === 'line' ? "active" : ""} onClick={() => setAssetChartType('line')}>Line</button>
              </div>

              <div className="selector">
                <button className={assetMode === 'price' ? "active" : ""} onClick={() => setAssetMode('price')}>Price</button>
                <button className={assetMode === 'mktValue' ? "active" : ""} onClick={() => setAssetMode('mktValue')}>Value</button>
              </div>
            </div>

            <div className="chart-container">
              {assetHistory.length > 0 ? (
                <Chart
                  key={`asset-${selectedStock.stock_id}-${assetChartType}-${assetMode}`}
                  type={assetChartType}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { type: 'time', time: { unit: 'day' }, grid: { display: false } },
                      y: { grid: { color: 'rgba(255,255,255,0.1)' } }
                    }
                  }}
                  data={{
                    datasets: [{
                      label: assetMode === 'price' ? 'Price' : 'Market Value',
                      data: assetHistory.map(d => ({
                        x: d.x,
                        ...(assetChartType === 'candlestick' 
                          ? { o: d.o, h: d.h, l: d.l, c: d.c } 
                          : { y: d.c }) 
                      })),
                      borderColor: '#ffc337',
                      color: { up: '#6FFF67', down: '#FF9494', unchanged: '#ffffff' },
                      borderWidth: 2,
                      tension: 0.3,
                      pointRadius: 0
                    }]
                  }}
                />
              ) : (
                <div className="chart-loader"><p>Loading stock data...</p></div>
              )}
            </div>
          </div>
      </>
      ) : (
        <div className="info-placeholder">
          <h2>Select an asset to view details</h2>
        </div>
      )}
    </div>

    <div className="holdings">
      <div className="holdings-content">
        <table className="holdings-table">
          <thead>
            <tr>
              <th>SYMBOL</th>
              <th>PRICE</th>
              <th>QTY</th>
              <th>AVG BUY</th>
              <th>VALUE</th>
              <th>P/L</th>
              <th>P/L (%)</th>
              <th>EXPOSURE</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const avgBuyTotal = Number(h.quantity) * Number(h.average_entry_price);
              const currentValTotal = Number(h.quantity) * Number(h.current_price);
              const rowPnl = currentValTotal - avgBuyTotal;
              const rowPnlPercent = avgBuyTotal !== 0 ? (rowPnl / avgBuyTotal) * 100 : 0;

              return (
                <tr 
                  key={`${h.holding_id}-${h.stock_id}`}
                  className={selectedStock?.holding_id === h.holding_id ? "selected" : ""}
                  onClick={() => setSelectedStock(h)}
                >
                  <td className="holding-symbol">{h.asset_symbol}</td>
                  <td>${Number(h.current_price || 0).toFixed(2)}</td>
                  <td>{h.quantity}</td>
                  <td>${Number(h.average_entry_price || 0).toFixed(2)}</td>
                  <td>${currentValTotal.toFixed(2)}</td>

                  <td className={getPnL(rowPnl)}>
                    {rowPnl >= 0 ? "+" : ""}${rowPnl.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td className={getPnL(rowPnl)}>
                    {rowPnlPercent >= 0 ? "+" : ""}{rowPnlPercent.toFixed(2)}%
                  </td>
                  
                  <td>{h.exposure}%</td>
                </tr>
              );
            })}
                      </tbody>
        </table>
      </div>
    </div>


      <div className="movers">
        <div className="movers-header">
          <h1>{moverFilter === "up" ? "TOP GAINERS" : "TOP LOSERS"}</h1>
          <div className="mover-controls">
            <img 
              src="/changeUp.svg" 
              alt="Up" 
              className={`control-icon rotate-fix ${moverFilter === "up" ? "active" : ""}`}
              onClick={() => setMoverFilter("up")}
            />
            <img 
              src="/changeDown.svg" 
              alt="Down" 
              className={`control-icon rotate-fix ${moverFilter === "down" ? "active" : ""}`}
              onClick={() => setMoverFilter("down")}
            />
          </div>
        </div>
        <div className="movers-content">
          {topMovers.length > 0 ? (
            topMovers.map((stock) => {
              const pnlPercent = (Number(stock.unrealised_pnl) / (Number(stock.quantity) * Number(stock.average_entry_price))) * 100;
              return (
                <div key={stock.stock_id} className="mover-card" onClick={() => setSelectedStock(stock)}>
                  <div className="mover-info">
                    <span className="mover-symbol">{stock.asset_symbol}</span>
                    <span className="mover-name">{stock.asset_name}</span>
                  </div>
                  <div className={`mover-stats ${getPnL(pnlPercent)}`}>
                    <span className="mover-price">${Number(stock.current_price).toFixed(2)}</span>
                    <span className="mover-percent">
                      {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="no-data">No holdings found</p>
          )}
        </div>
      </div>
  </div>
    </>
  );
}
