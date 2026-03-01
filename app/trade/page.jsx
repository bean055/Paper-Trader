'use client';
import { useEffect, useState, useCallback, Suspense } from "react";
import {socket} from "../utilities/socket"
import "../../styles/pages/trade.css"
import Navbar from "../components/Navbar"
import "../../styles/global.css";
import {manageWatchlist} from "../actions/watchlist";
import {manageAlert } from "../actions/alerts";
import AlertUI from "../components/trade/alert";
import { useRouter, useSearchParams } from "next/navigation";

export default function TradePage() {
  return (
    <Suspense fallback={<div>Loading Trade...</div>}>
      <Trade />
    </Suspense>
  );
}

function Trade() {
  const [stocks, setStocks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState(null);
  const [page, setPage] = useState(1);
  const [watchlist, setWatchlist] = useState([])
  const [alerts, setAlerts] = useState ([])
  const [AlertComponent,setAlertComponent] = useState(false);

  const [orderType, setOrderType] = useState('BUY');
  const [quantity, setQuantity] = useState(0);

  const [portfolio, setPortfolio] = useState(null);
  const [holdings, setHoldings] = useState([]);

  const stocksPerPage = 7;
    const filteredStocks = stocks.filter(stock => 
    stock.asset_symbol?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filteredStocks.length / stocksPerPage);
  const startIndex = (page - 1) * stocksPerPage;
  const paginatedStocks = filteredStocks.slice(startIndex, startIndex + stocksPerPage);
  
  const router = useRouter();
  const searchParams = useSearchParams()
  const symbolFromUrl = searchParams.get('symbol');

  const fetchTradePage = useCallback(async () => {
    try {
      const response = await fetch(`/api/trades/fetch?page=${page}`); 
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fetch failed");
      }
      
      const data = await response.json();
      setStocks(data.stocks || []);
    } catch (error) {
      console.error("Error fetching stocks:", error.message);
    } finally {
    }
  }, [page]);


  const fetchWatchlist = useCallback(async () => {
    try {
      const response = await fetch(`/api/news?type=watchlist`);
      const data = await response.json();
      setWatchlist(data.watchlist || []);
    } catch (error) {
      console.error("Watchlist error:", error);
    }
  }, []);
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch(`/api/news?type=alerts`);
      const data = await response.json(); 
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error("Alerts error:", error);
    }
  }, []);  

  const fetchPortfolio = useCallback(async () => {
    try {
      const response = await fetch('/api/portfolio'); 
      const data = await response.json();
      if (response.ok) {
        setPortfolio(data.portfolio);
        setHoldings(data.holdings);
      }
    } catch (error) {
      console.error("Portfolio fetch error", error);
    }
  }, []);

  useEffect(() => {
    fetchTradePage();
    fetchWatchlist();
    fetchAlerts();
    fetchPortfolio();
  }, [fetchTradePage, fetchWatchlist, fetchAlerts, fetchPortfolio]); 

  useEffect(() => {
    if (symbolFromUrl && stocks.length > 0) {
      const stockToSelect = stocks.find(
        (s) => s.asset_symbol?.toLowerCase() === symbolFromUrl.toLowerCase()
      );
      
      if (stockToSelect) {
        setSelectedStock(stockToSelect);
      }
    }
  }, [symbolFromUrl, stocks]);

  useEffect(() =>{
    setPage(1);
  },[searchQuery]);

  const handleWatchlistToggle = async (ticker)=> {
    const result = await manageWatchlist({ticker})
    if (result.success){
      if(result.status === 'deleted'){
        setWatchlist(prev => prev.filter(item=> item.ticker !== ticker));
      }else{
        fetchWatchlist();
      }
      }
    };
    const handleAlertToggle = async (ticker)=> {
    setAlertComponent(true);
    };
    const SaveAlert = async (condition, value) => {
    const result = await manageAlert({ 
      ticker: selectedStock.asset_symbol, 
      condition, 
      value 
    });
    if (result.success) {
      fetchAlerts(); 
      setAlertComponent(false); 
    } 
  };

  const confirmTrade = async () => {
  if (!selectedStock || quantity <= 0) return;

  try {
    const response = await fetch('/api/trades/execution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: orderType,   
        quantity: Number(quantity),
        stockId: selectedStock.stock_id
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log("Trade completed", data.tradeId);
      fetchPortfolio();setQuantity(0);
    } else {
      alert(data.error || "Trade failed");
    }
  } catch (error) {
    console.error("Trade network error", error);
  }
};
  
const getRecommendationMetrics = (rec) => {

  if (!rec || Object.keys(rec).length === 0) {
    return { score: "N/A", pct: "0%", color: "#5d5d5d" };
  }

  const total = (rec.strongBuy || 0) + (rec.buy || 0) + (rec.hold || 0) + (rec.sell || 0) + (rec.strongSell || 0);
  if (total === 0) return { score: "N/A", pct: "0%", color: "#5d5d5d" };

  const score = (
    (rec.strongBuy * 5) + 
    (rec.buy * 4) + 
    (rec.hold * 3) + 
    (rec.sell * 2) + 
    (rec.strongSell * 1)
  ) / total;
  const buyPct = (((rec.strongBuy + rec.buy) / total) * 100).toFixed(0);
  let color = "#ffc83e"; 
  if (score >= 3.75) color = "#31c969"; 
  if (score <= 2.25) color = "#e05252"; 

  return { 
    score: score.toFixed(2), 
    pct: `${buyPct}%`, 
    color 
  };
};

  const linkToChart = (ticker) => {
    router.push(`/chart?symbol=${ticker}`);
  };
  const currentHolding = holdings.find(h => h.stock_id === selectedStock?.stock_id);
const sharesOwned = currentHolding ? currentHolding.quantity : 0;

return (
  <>
    <Navbar />
    {AlertComponent && selectedStock && (
        <div className="alert-overlay" onClick={() => setAlertComponent(false)}>
          <div className="alert-container" onClick={(e) => e.stopPropagation()}>
             <AlertUI
              isOpen={AlertComponent}
               ticker={selectedStock.asset_symbol} 
               currentPrice={selectedStock.current_price}
               onSave={SaveAlert} onClose={() => setAlertComponent(false)} 
             />
          </div>
        </div>
      )}

    <div className="trade-page">
      <div className="Stocks-panel">
        <div className="stock-list-banner">
          <h1>Market</h1>
          <input type="text" className="search-stocks" placeholder="Search ticker..."
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="stock-list-container">
            {paginatedStocks.map((stock) => {
              const isWatchlisted = watchlist.some(w => w.ticker === stock.asset_symbol);

              return (
                <div
                  key={stock.stock_id || stock.asset_symbol}
                  className={`stock-item ${selectedStock?.stock_id === stock.stock_id ? 'active' : ''}`}
                  onClick={() => setSelectedStock(stock)}
                >
                  <div className="ticker-box">
                    <img 
                      src={isWatchlisted ? "eye.svg" : "eye-off.svg"} 
                      className="eye-icon" 
                    />
                    <span className="symbol-text">{stock.asset_symbol}</span>
                    <span className="name-text">{stock.asset_name}</span>
                  </div>
                  <span className="current-price">${Number(stock.current_price).toFixed(2)}</span>
                </div>
              );
            })
          }
        </div>
         <div className="pagination">
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Prev
          </button>
          <span> Page {page} of {totalPages || 1} </span>
          <button 
            onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
      

      <div className="info-panel">
        <h3 className="panel-title">Asset Overview</h3>
        {selectedStock ? (
          <div className="details-view">
            <div className="detail-header">
              <div className="header-left">
                <h1 className="info-symbol">{selectedStock.asset_symbol}</h1>
                <button className="watchlist-toggle-btn" onClick={() => handleWatchlistToggle(selectedStock.asset_symbol)}>
                   <img 
                    src={watchlist.some(w => w.ticker === selectedStock.asset_symbol) ? "eye.svg" : "eye-off.svg"} />
                </button>
                <button className="alert-toggle-btn" onClick={()=> handleAlertToggle(selectedStock.asset_symbol)}>
                 <img src={alerts.some(a => a.ticker === selectedStock.asset_symbol) ? "bell.svg" : "bell-off.svg"}/>
                </button>
                <button className="chart-link" onClick={() => linkToChart(selectedStock.asset_symbol)}>
                  <img src={"chart-link.png"}></img>
                </button>
              </div>
              <div className = "header-right">
                <img src={selectedStock.logo_url} className="logo"
                />
              </div>
            </div>
              <div className="tags">
                <span className="sector-tag">{selectedStock.sector}</span>
                <a 
                  href={selectedStock.website} className="webURL" target="_blank" rel="noopener noreferrer">
                  Visit Website
                </a>
                <span className="currency-tag">{selectedStock.currency}</span>
              </div>
            

            <h2 className="info-full-name">{selectedStock.asset_name}</h2>
            <div className="detail-grid">
              <div className="detail-stat">
                <label>Current Price</label>
                <p className="price-current">${Number(selectedStock.current_price).toFixed(2)}</p>
              </div>
              <div className="detail-stat">
                <label>Last Price</label>
                <p className="price-Last">${Number(selectedStock.last_price).toFixed(2)}</p>
              </div>
              <div className="detail-stat">
                <label>Market Cap</label>
                <p className="Marketcap">${Number(selectedStock.market_cap).toFixed(2)}</p>
              </div>
              <div className="detail-stat">
                <label>P/E ratio</label>
                <p className="pe_ratio">${Number(selectedStock.pe_ratio).toFixed(2)}</p>
              </div>
              <div className="detail-stat">
                <label>eps</label>
                <p className="eps">${Number(selectedStock.eps).toFixed(3)}</p>
              </div>
              <div className="detail-stat">
                <label>52 week high / low</label>
                <p className="high/low">${Number(selectedStock.high_52).toFixed(2)} / ${Number(selectedStock.low_52).toFixed(2)}</p>
              </div>
              {selectedStock.dividend_yield && Number(selectedStock.dividend_yield) > 0 && (
                <div className="detail-stat">
                  <label>Dividend Yield</label>
                  <p className="dividend-val">{Number(selectedStock.dividend_yield).toFixed(2)}%</p>
                </div>
              )}            
              <div className="detail-stat">
                <label>Analyst Sentiment</label>
                {(() => {
                  const { score, pct, color } = getRecommendationMetrics(selectedStock.recommendation_json);
                  return (
                    <div className="sentiment-display">
                      <p style={{ color: color, fontSize: '1.1rem', margin: 0 }}>
                        {score} <span style={{ fontSize: '0.7rem', color: '#b8b8b8' }}>/ 5.0</span>
                      </p>
                      <p style={{ fontSize: '0.65rem', margin: 0, opacity: 0.8 }}>
                        {pct} Buy Agreement
                      </p>
                    </div>
                  );
              })()}
            </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <img src="/info.svg" alt="No selection" />
            <p>Select an asset from the list to view performance data</p>
          </div>
        )}
      </div>

      <div className="watchlist-panel-t">
        <h3 className="panel-title">Watchlist</h3>
        <div className="stock-list-container">
          {watchlist.map((item) => (
            <div key={item.ticker} className="stock-item">
              <div className="watchlist-item-left">
                <div className="current-price">${Number(item.current_price).toFixed(2)}</div>
                <div className={item.percent_change >= 0 ? "change-up" : "change-down"}>
                  {item.percent_change >= 0 } {Math.abs(Number(item.percent_change)).toFixed(2)}%
                </div>
              </div>
              <div className="watchlist-item-right">
                <button className="remove-btn" onClick={() => handleWatchlistToggle(item.ticker)}>
                  <img src="eye.svg" alt="Watchlisted" className="watchlist-icon" />
                </button>
                <div className="ticker-box">
                  <span className="ticker-name">{item.ticker}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="execution-panel">
        <div className="panel-header">
          <h3 className="panel-title">Trade Execution</h3>
          <div 
            className={`order-type-toggle ${orderType}`} 
            onClick={() => setOrderType(prev => (prev === "BUY" ? "SELL" : "BUY"))}
          >
            <div className="slider"></div>
            <span className="type-BUY">BUY</span>
            <span className="type-SELL">SELL</span>
          </div> 
        </div>
        
        {selectedStock ? (
          <div className="trade-execution-container">
            <div className="trade-ex-header">
              <span className="ex-symbol">{selectedStock.asset_symbol}</span>
              <span className="ex-name">{selectedStock.asset_name}</span>
            </div>

            <div className="trade-ex-stats">
              <div className="ex-stat-row">
                <label>Shares Held</label>
                <span>{sharesOwned}</span> 
              </div>
              
              <div className="ex-stat-row">
                <label>Balance</label>
                <span>${Number(portfolio.balance).toFixed(2)}</span>
              </div>

              <div className="ex-stat-row">
                <label>Price</label>
                <span>${Number(selectedStock.current_price).toFixed(2)}</span>
              </div>

              <div className="ex-stat-row">
                <label>position</label>
                <span>${currentHolding ? (sharesOwned * Number(selectedStock.current_price)).toFixed(2) : "0.00"}</span>
              </div>

              <div className="ex-stat-row">
                <label>Market Value</label>
                <span>${Number(selectedStock.current_price * quantity).toFixed(2)}</span>
              </div>
            </div>

            <div className="trade-ex-inputs">
              <label>Quantity</label>
              <input 
                type="number" 
                value={quantity} 
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="quantity-input"
                min="0"
              />

              <button 
                className="confirm-btn"
                onClick={confirmTrade} 
                disabled={quantity <= 0}
                style={{ opacity: quantity <= 0 ? 0.5 : 1 }}
              >
                Confirm {orderType} Order
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p>Select an asset to trade</p>
          </div>
        )}
      </div>
    </div>
  </>
);}