'use client';
import { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import "../../styles/pages/dashboard.css"; 

import { TreemapController, TreemapElement } from 'chartjs-chart-treemap';
import { Chart as ChartJS, TimeScale, LinearScale, Tooltip, PointElement, LineElement, CategoryScale, Filler, ArcElement,PieController } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns'; 
ChartJS.register(TimeScale, LinearScale, Tooltip, PointElement, LineElement, CategoryScale, Filler,TreemapController, TreemapElement,
  ArcElement, PieController
);

export default function Dashboard() {

  const [dashboardData, setDashboardData] = useState({
    portfolio: {},
    holdings: [],
    news: [],
    trades: [],
    watchlist: [],
    stocks: [],
    history: [],
    monthlyPerformance:[]
  });
  const [moverType, setMoverType] = useState("gains");
  const [moverScope, setMoverScope] = useState("global");
  const [chartMode, setChartMode] = useState('equity'); 
  const [timeFrame, setTimeFrame] = useState(30);
  const [graphMode, setgraphMode] = useState(0);
  const modes = ["Quantity","Value","Sectors","Portfolio Diversity"]
  const cycleMode = (direction) => {
    setgraphMode((prev) => {
      if (direction === 'next') return (prev + 1) % modes.length;
      return (prev - 1 + modes.length) % modes.length;
    });
  };

  const loadDashboard = async () => {
    try {
      const [portfolioRes, tradesRes, stocksMarketRes, newsRes, historyRes] = await Promise.all([
        fetch('/api/portfolio'),
        fetch('/api/trades'),
        fetch('/api/trades/fetch'),
        fetch('/api/news?type=all'), 
        fetch('/api/portfolio/history?timeframe=180')
      ]); 

      const portfolioData = await portfolioRes.json();
      const tradeData = await tradesRes.json();
      const stocksData = await stocksMarketRes.json();
      const newsData = await newsRes.json();
      const historyData = await historyRes.json();
      const formattedHistory = historyData.map((day) => ({
        x: new Date(day.recorded_at).getTime(),
        y: Number(day.equity_point || 0),
        cash: Number(day.balance_point || 0)
      }));

      const performanceData = getMonthlyStats(formattedHistory)

      setDashboardData({
        portfolio: portfolioData.portfolio,    
        holdings: portfolioData.holdings || [], 
        trades: tradeData.trades || [],
        news: (newsData.news || []).slice(0,5),       
        watchlist: newsData.watchlist || [],
        stocks: stocksData.stocks || [],
        history: formattedHistory,
        monthlyPerformance: performanceData
      });
    } catch (error) {
      console.error("dashboard fetch Error", error);
    } 
  };

  const getTreeMapData = () => {
  return dashboardData.holdings.map(h => ({
    symbol: h.asset_symbol,
    Quantity: Number(h.quantity),
    Value: Number(h.quantity) * Number(h.current_price || 0)
  }));
};

  useEffect(() => {
    loadDashboard();
  }, []);

  const getMovers = () => {
  const { stocks, holdings } = dashboardData;

  let targetList = moverScope === 'global' 
    ? stocks 
    : stocks.filter(s => holdings.some(h => h.asset_symbol === s.asset_symbol));

  const calculated = targetList.map(s => {
    const change = ((s.current_price - s.last_price) / s.last_price) * 100;
    return { ...s, percentChange: change };
  });

  return calculated.sort((a, b) => {
    return moverType === 'gains' 
      ? b.percentChange - a.percentChange 
      : a.percentChange - b.percentChange;
  }).slice(0, 5); 
  };


  const getMonthlyStats = (history) => {
    const monthList = [];
    const historyMap = history.reduce((acc, entry) => {
      const d = new Date(entry.x);
      const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      acc[key] = entry.y; 
      return acc;
    }, {});

    for (let i = 0; i < 6; i++) {

      const date = new Date();
      date.setDate(1); 
      date.setMonth(date.getMonth() - i); 
      
      monthList.push({
        label: date.toLocaleString('default', { month: 'short' }),
        year: date.toLocaleString('default', { year: 'numeric' }),
        fullKey: date.toLocaleString('default', { month: 'short', year: 'numeric' })
      });
    }

    return monthList.map((m, index) => {
      const currentVal = historyMap[m.fullKey];
      
      const prevMonth = monthList[index + 1];
      const previousVal = prevMonth ? historyMap[prevMonth.fullKey] : null;

      let percentChange = null;
      let changeValue = null;
      if (currentVal !== undefined && previousVal !== undefined && previousVal !== 0) {
        changeValue = currentVal - previousVal;
        percentChange = (changeValue / previousVal) * 100;
      }
      return {
        label: m.label,
        year: m.year,
        change: changeValue,
        changeP: percentChange
      };
    });
  };

  const sectorColour = {
    Equity: '#4c436d',
    Cash: '#8e81bc',
    Semiconductors:'#4c436d',
    Technology:'#524875',
    Retail:'#584d7d',
    "Financial Services":'#5e5285',
    Media:'#64578d',
    "Logistics & Transportation": '#6a5c95',
    Pharmaceuticals:'#70619d',
    Beverages: '#645886',
    "Hotels, Restaurants & Leisure":'#7666a5',
    Energy: '#7c6bad',
    Biotechnology:'#8270b5',
    Banking:'#8875bd',
    "Consumer products":'#8e7ac5',
    "Aerospace & Defense":'#9481c9',
    "Textiles, Apparel & Luxury Goods":'#9a88cd',
    Automobiles: '#a08fd1',
    "Health Care":'#8e81bc',
    Communications:'#8e81bc',
    Other:`#261f3e`,

  };

  const getSectorData = () => {
    const sectors = {};
    let totalEquityValue = 0; 

    dashboardData.holdings.forEach(h => {
      const sector = h.sector || 'Other';
      const value = Number(h.quantity) * Number(h.current_price || 0);
      sectors[sector] = (sectors[sector] || 0) + value;
      totalEquityValue += value; 
    });

    const labels = Object.keys(sectors).map(sectorName => {
      const sectorValue = sectors[sectorName];
      const percentage = totalEquityValue > 0 
        ? ((sectorValue / totalEquityValue) * 100).toFixed(1) 
        : 0;
      
      return `${sectorName} (${percentage}%)`;
    });

    return {
      labels: labels,
      datasets: [{
        data: Object.values(sectors),
        backgroundColor: Object.keys(sectors).map(s => sectorColour[s] || '#444'),
        borderWidth: .75, 
        hoverOffset: 15
      }]
    };
  };

  const getPnL = (value) => (value >= 0 ? "positive" : "negative");
  const getTradeType = (value) => (value === "SELL" ? "red" : "green");

  const colExposure = (val) => {
    if (val >= 80) return "red"; 
    if (val >= 50) return "orange";   
    return "green";                   
  };
  const colTopPos = (val) => {
    const num = parseFloat(val);
    if (num > 30) return "red"; 
    if (num > 15) return "orange";
    return "green";
  };
  const colRR = (val) => {
    const num = parseFloat(val);
    if (num >= 2) return "green";     
    if (num >= 1) return "orange";     
    return "red";              
  };
  const colVolatility = (val) => {
    const tradesPerDay = parseFloat(val);
    if (tradesPerDay > 2.5) return "red";   
    if (tradesPerDay > 1) return "orange";    
    return "green";            
  }             
  const colDrawDown = (val) => {
    const num = parseFloat(val);
    if (num > 20) return "red";
    if (num > 10) return "orange";
    return "green";
  };
  const colEdge = (val) => {
    const num = parseFloat(val);
    return num > 0 ? "green" : "red";
  };


  const getRiskMetrics = () => {
    const { holdings, trades, portfolio, history} = dashboardData;
    const equity = Number(portfolio.equity) || 0;
    const balance = Number(portfolio.balance) || 0;
    const totalValue = Number(portfolio.total_value) || (equity + balance);

    let topPosWeight = "0.0";
    if (holdings.length > 0) {
      const vals = holdings.map(h => Number(h.quantity) * Number(h.current_price || 0));
      const maxVal = Math.max(...vals);
      topPosWeight = totalValue > 0 ? ((maxVal / totalValue) * 100).toFixed(2) : "0.00";
    }

   const sellTrades = trades.filter(trades => trades.trade_type === 'SELL' && trades.rr_ratio !== null);

    const totalRR = sellTrades.reduce((acc, trades) => {
      const val = parseFloat(trades.rr_ratio);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

    const avgRR = sellTrades.length ? (totalRR / sellTrades.length).toFixed(2) : "0.00";
    const wins = sellTrades.filter(t => parseFloat(t.rr_ratio) > 0).length;
    const rawWinRate = sellTrades.length ? (wins / sellTrades.length) : 0;
    
    const avgWinRR = wins > 0 
      ? (sellTrades.filter(t => parseFloat(t.rr_ratio) > 0).reduce((acc, t) => acc + parseFloat(t.rr_ratio), 0) / wins) 
      : 0;
    const lossRate = 1 - rawWinRate;
    const edgeValue = ((rawWinRate * avgWinRR) - (lossRate * 1)).toFixed(2);

    const tradeTimestamps = trades.map(t => new Date(t.executed_at).getTime()).filter(t => !isNaN(t));
    const firstTrade = tradeTimestamps.length ? Math.min(...tradeTimestamps) : Date.now();
    const daysActive = Math.max((Date.now() - firstTrade) / (1000 * 60 * 60 * 24), 1);
    const tradesPerDay = trades.length / daysActive;


    let peak = -Infinity;
    let maxDD = 0;

    history.forEach((h) => {
      const histValue = Number(h.equity_point+h.balance_point);
      if (histValue > peak) peak = histValue;
      
      if (peak > 0) {
        const currentDD = (peak - histValue) / peak;
        if (currentDD > maxDD) maxDD = currentDD;
      }
    });

    return {
      avgRR,
      topPosWeight,
      expectancy: edgeValue,
      volatility: tradesPerDay.toFixed(2),
      DrawDown: (maxDD * 100).toFixed(2) 
    };
  };

  const metrics = getRiskMetrics();
  
  const getRiskScore = () => {
    const { portfolio } = dashboardData;
    const { topPosWeight, DrawDown, volatility, expectancy } = metrics;
    let score = 0;

    if (portfolio.risk_exposure > 80) score += 2;
    else if (portfolio.risk_exposure > 50) score += 1;

    if (parseFloat(topPosWeight) > 30) score += 2;
    else if (parseFloat(topPosWeight) > 15) score += 1;

    if (parseFloat(volatility) > 3) score += 2;
    else if (parseFloat(volatility) > 1) score += 1;

    if (parseFloat(DrawDown) > 20) score += 2;
    else if (parseFloat(DrawDown) > 10) score += 1;

    if (parseFloat(expectancy) < 0) score += 2;
    else if (parseFloat(expectancy) < 2) score += 1;
  return score;
};

const RiskScore = getRiskScore();

const getScoreColor = (score) => {
  if (score >= 8) return "red";
  if (score >= 4) return "orange";
  return "green";
};

  return (
    <>
      <Navbar />
      <div className="Dashboard-page">
          <div className="account-panel">

            <div className="account-stats">
              <div className="stats-box">
                <h3>Username:</h3>
                <p>{dashboardData.portfolio.username}</p>
              </div>
              <div className="stats-box">
                <h3>Balance:</h3>
                <p>${dashboardData.portfolio.balance}</p>
              </div>
              <div className="stats-box">
                <h3>Assets</h3>
                <p>{dashboardData.holdings.length}</p>
              </div>
              <div className="stats-box">
                <h3>portfolio value</h3>
                <p>{dashboardData.portfolio.equity}</p>
              </div>

            </div>

            <div className="account-chart-container">
              <div className="chart-controls">
              <div className="timeframe-container">
                <div 
                  className="timeframe-slider" 
                  style={{ 
                    transform: `translateX(${[7, 30, 90, 180].indexOf(timeFrame) * 100}%)` 
                  }}
                />
                {[7, 30, 90, 180].map((tf) => (
                  <button 
                    key={tf} 
                    className={`timeframe-btn ${timeFrame === tf ? 'active' : ''}`} 
                    onClick={() => setTimeFrame(tf)}
                  >
                    {tf === 180 ? 'ALL' : `${tf}D`}
                  </button>
                ))}
              </div>
              </div>
              <div className="dashboard-account-chart">
                {dashboardData.history.length > 0 ? (
                  <Chart
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
                          grid: { color: 'rgba(255, 255, 255, 0.05)' },
                          ticks: { color: '#878787', callback: (val) => `$${Number(val).toLocaleString()}` }
                        }
                      }
                    }}
                    data={{
                        datasets: [
                          {
                            label: chartMode === 'equity' ? 'Portfolio Equity' : 'Cash Balance',                         
                            data: dashboardData.history
                              .filter(d => d.x >= Date.now() - (timeFrame * 24 * 60 * 60 * 1000)) 
                              .map(d => ({ 
                                x: d.x, 
                                y: chartMode === 'equity' ? d.y : d.cash 
                              })),
                            borderColor: chartMode === 'equity' ? '#6FFF67' : '#ffffff',
                          borderWidth: 2,
                          pointRadius: 0,
                          fill: true,
                          backgroundColor: chartMode === 'equity' 
                            ? 'rgba(111, 255, 103, 0.05)' 
                            : 'rgba(255, 255, 255, 0.05)',
                          tension: 0.4 
                        }
                      ]
                    }}
                  />
                ) : (
                  <div className="chart-loader"><p>Loading history...</p></div>
                )}
              </div>       
            </div>
          </div>


          <div className="graph-panel">
            <div className="panel-header">
              <div className="title-group">
                <h1>{modes[graphMode]}</h1>
              </div>
              
              <div className="chart-nav">
                <button className="nav-arrow" onClick={() => cycleMode('prev')}>
                  <img src="/arrow-left.svg"/>
                </button>
                <button className="nav-arrow" onClick={() => cycleMode('next')}>
                  <img src="/arrow-right.svg"/>
                </button>
              </div>
            </div>

            <div className="graph-container">
            {(() => {
              const currentMode = modes[graphMode];            
              if (currentMode === "Portfolio Diversity") {
                return (               
                  <Chart
                    type="pie"
                    data={{
                      labels: [
                        `Equity (${((dashboardData.portfolio.equity / (Number(dashboardData.portfolio.equity) + Number(dashboardData.portfolio.balance))) * 100).toFixed(1)}%)`,
                        `Cash (${((dashboardData.portfolio.balance / (Number(dashboardData.portfolio.equity) + Number(dashboardData.portfolio.balance))) * 100).toFixed(1)}%)`
                      ],
                      datasets: [{
                        data: [dashboardData.portfolio.equity, dashboardData.portfolio.balance],
                        backgroundColor: [sectorColour.Equity, sectorColour.Cash],
                        borderWidth: 2,
                        hoverOffset: 5
                      }]
                    }}
                    options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: true,
                          position: 'bottom',
                          labels: { color: '#878787', font: { size: 11 }, padding: 20 }
                        }
                      }
                    }}
                  />
                );
              }

              if (currentMode === "Sectors") {
                return (
                  <Chart
                    type="pie"
                    data={getSectorData()}
                    options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: true,
                          position: 'right',
                          labels: { color: '#878787', font: { size: 10 }, padding: 10 }
                          
                        }
                      }
                    }}
                  />
                );
              }

              return (
                <Chart
                  type="treemap"
                  data={{
                    datasets: [{
                      label: 'Portfolio',
                      tree: getTreeMapData(),
                      key: currentMode === 'Quantity' ? 'Quantity' : 'Value',
                      groups: ['symbol'],
                      spacing: 1,
                      borderWidth: 0,
                      borderRadius: 4,
                      backgroundColor: (ctx) => {
                        if (ctx.type !== 'data' || !ctx.raw) return 'transparent';
                          const data = ctx.raw._data || ctx.raw;
                          
                          const currentMetric = currentMode === 'Quantity' ? 'Quantity' : 'Value';
                          const activeValue = data?.[currentMetric] ?? 0;
                          const allValues = getTreeMapData().map(h => h[currentMetric]);
                          const maxValue = Math.max(...allValues, 1);

                          const intensity = Math.sqrt(activeValue / maxValue);
                          const alpha = 0.2 + (intensity * 0.4);
                          
                          return `rgba(127, 255, 161, ${alpha})`; 
                      },
                      labels: {
                        display: true,
                        formatter: (ctx) => {
                          const data = ctx.raw?._data || ctx.raw;
                          if (!data || !data.symbol) return ""; 
                          
                          return [
                            data.symbol, 
                            currentMode === 'Quantity' 
                              ? `QTY: ${data.Quantity.toLocaleString()}` 
                              : `$${Math.round(data.Value).toLocaleString()}`
                          ];
                        },
                        color: '#ffffff',
                        font: { size: 12, weight: 'bold' }
                      }
                    }]
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (item) => {
                            const data = item.raw?._data || item.raw; 
                            if (!data) return 'Loading...';
                            
                            return [
                              `${data.symbol}`,
                              `Value: $${Number(data.Value).toLocaleString()}`,
                              `Quantity: ${Number(data.Quantity).toLocaleString()}`,
                            ];
                          }
                        }
                      }
                    }
                  }}
                />
              );
            })()}
            </div>
          </div>


          <div className="dashboard-watchlist-panel">
            <div className="panel-header">
            <h1>Watchlist</h1>
            </div>
            <div className="watchlist-feed">
            {dashboardData.watchlist.length > 0 ? (
              dashboardData.watchlist.map((w) => (
                <div key={w.watchlist_id} className="watchlist-row">
                  <div className="watch-symbol">{w.ticker}</div>
                  <div className="watch-price">${Number(w.current_price).toFixed(2)}</div>
                  <div className="watch-change">${Number(w.last_price).toFixed(2)}</div>
                </div>
              ))
            ) : (
                <p className="empty">Watchlist is empty</p>
            )}
            </div>
          </div>

          <div className="dashboard-news-panel">
            <div className="panel-header">
              <h1>Recent News</h1>
            </div>
            <div className="news-feed">
              {dashboardData.news.length > 0 ? (
                dashboardData.news.map((n) => (
                  <div key={n.news_id} className="news-row">
                    <div className="news-headline">{n.headline}</div>
                    <div className="news-source">{n.source} </div>
                    <div className="news-date">{new Date(n.published_at).toLocaleDateString()}</div>
                  </div>
                ))
              ) : (
                  <p className="empty">No news found.</p>
              )}
            </div>
          </div>

          <div className="dashboard-trades-panel">
            <div className="panel-header">
              <h1>Recent Trades</h1>
            </div>
            <div className="trades-feed">
            {dashboardData.trades.length > 0 ? (
              dashboardData.trades.map((t) => (
                <div key={t.trade_id} className="trade-row">
                  <div className="trade-symbol">{t.symbol}</div>
                  <div className={`trade-type ${getTradeType(t.trade_type)?.toLowerCase()}`}>
                    {t.trade_type}
                  </div>
                  <div className="trade-quantity">{t.quantity} Shares</div>
                  <div className="trade-price">${Number(t.price).toFixed(2)}</div>
                  <div className="trade-total">${Number(t.trade_total).toLocaleString()}</div>
                </div>
              ))
            ) : (
                <p className="empty">No trades found.</p>
            )}
            </div>
          </div>

          <div className="risk-assessment">
            <div className="panel-header">
              <h1>Risk Assesment</h1>
            </div>
            <div className="risk-feed">
              <div className="risk-metric">
                <h1>Exposure</h1>
                <span className={`exposure ${colExposure(dashboardData.portfolio.risk_exposure)}`}>{dashboardData.portfolio.risk_exposure}</span>
              </div>
              <div className="risk-metric">
                <h1>Top Position</h1>
                <span className={colTopPos(metrics.topPosWeight)}>
                  {metrics.topPosWeight}%
                </span>
              </div>

              <div className="risk-metric">
                <h1>Avg Risk:Reward</h1>
                <span className={colRR(metrics.avgRR)}>
                  1:{metrics.avgRR}
                </span>
              </div>

              <div className="risk-metric">
                <h1>DrawDown</h1>
                <span className={colDrawDown(metrics.DrawDown)}>
                  {metrics.DrawDown}</span>
              </div>

              <div className="risk-metric">
                <h1>Volatility</h1>
                <span className={colVolatility(metrics.colVolatility)}>{metrics.volatility}</span>
              </div>

              <div className="risk-metric">
                <h1>Edge value</h1>
                <span className= {colEdge(metrics.expectancy)}>
                {metrics.expectancy}%</span>
              </div>
            </div>       
            <div className="risk-rating">
              <h1>Risk Score:</h1>
              <div className="score-display">
                <span className={`score-number ${getScoreColor(RiskScore)}`}>
                  {RiskScore}
                </span>
                <span className="score-total">/10</span>
              </div>
            </div>
          </div>

          <div className="dashboard-movers-panel">
            <div className="panel-header">
              <h1>Top Movers</h1>
              <div className="mover-controls">
                <button onClick={() => setMoverType("gains")}>
                  <img src="/changeup.svg" />
                </button>
                <button onClick={() => setMoverType("losses")}>
                  <img src="/changedown.svg"/>
                </button>
              </div>
                <div 
                  className={`mover-scope ${moverScope}`} 
                  onClick={() => setMoverScope(prev => (prev === "global" ? "owned" : "global"))}
                >
                  <div className="slider"></div>
                  <img className="scope-global" src="/global.svg" />
                  <img className="scope-owned" src="/owned.svg"  />
                </div> 
              </div>
            <div className="movers-list">
              { getMovers().map((m) => (
                <div key={m.stock_id} className="mover-row">
                  <div className="mover-symbol">{m.asset_symbol}</div>
                  <div className="mover-name">{m.asset_name}</div>
                  <div className={`mover-change ${getPnL(m.percentChange)}`}>
                    {m.percentChange > 0 ? '+' : ''}{m.percentChange.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="monthly-performance">
            <div className="panel-header">
              <h1>Monthly Performance</h1>
            </div>
            <div className="monthly-grid">
              {dashboardData.monthlyPerformance?.map((m, index) => (
                <div key={index} className="month-slot">
                  <div className="month-label">{m.label || "—"}</div>
                  <div className="month-label">{m.year || "—"}</div>
                  <span className={`month-change ${m.change !== null ? getPnL(m.change) : ""}`}>
                    {m.change !== null 
                      ? `${m.change > 0 ? '+' : ''}${m.change.toFixed(2)}` 
                      : "~"
                    }
                  </span>
                  <span className={`month-change ${m.changeP !== null ? getPnL(m.changeP) : ""}`}>
                    {m.changeP !== null 
                      ? `${m.changeP > 0 ? '+' : ''}${m.changeP.toFixed(1)}%` 
                      : "~"
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
    </>
  );
}