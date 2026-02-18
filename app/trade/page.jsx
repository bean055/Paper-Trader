'use client';
import { useEffect, useState, useCallback } from "react";
import "../../styles/pages/trade.css"
import Navbar from "../components/Navbar"
import "../../styles/global.css";
import {manageWatchlist} from "../actions/watchlist";

export default function Trade() {
  const [stocks, setStocks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState([])

  const fetchTradePage = useCallback(async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  }, [page]);


  const fetchWatchlist = useCallback(async () => {
    try {
      const response = await fetch(`/api/news?type=watchlist`);
      const data = await response.json();
      console.log("Watchlist data received:", data.watchlist); 
      setWatchlist(data.watchlist || []);
    } catch (error) {
      console.error("Watchlist error:", error);
    }
  }, []); 

useEffect(() => {
  fetchTradePage();
  fetchWatchlist();
}, [fetchTradePage, fetchWatchlist]); 

  const filteredStocks = stocks.filter(stock => 
    stock.asset_symbol?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
  
return (
  <>
    <Navbar />
    <div className="trade-page">
      <div className="Stocks-panel">
        <div className="stock-list-banner">
          <h1>Market</h1>
          <input
            type="text"
            className="search-stocks"
            placeholder="Search ticker..."
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="stock-list-container">
          {loading ? (
            <p>Loading market data...</p>
          ) : (
            filteredStocks.map((stock) => {
              const isWatchlisted = watchlist.some(w => w.ticker === stock.asset_symbol);

              return (
                <div
                  key={stock.stock_id || stock.asset_symbol}
                  className={`stock-item ${selectedStock?.stock_id === stock.stock_id ? 'active' : ''}`}
                  onClick={() => setSelectedStock(stock)}
                >
                  <div className="ticker-box">
                    <img 
                      src={isWatchlisted ? "eye.svg" : "eye2.svg"} 
                      alt="watchlst" 
                      className="eye-icon" 
                    />
                    <span className="symbol-text">{stock.asset_symbol}</span>
                    <span className="name-text">{stock.asset_name}</span>
                  </div>
                  <span className="current-price">${Number(stock.current_price).toFixed(2)}</span>
                </div>
              );
            })
          )}
        </div>
         <div className="pagination">
            <button onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
            <span> {page} </span>
            <button onClick={() => setPage(p => p + 1)}>Next</button>
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
                    src={watchlist.some(w => w.ticker === selectedStock.asset_symbol) ? "eye.svg" : "eye2.svg"} 
                    alt="toggle watchlist" 
                   />
                </button>
              </div>
              <span className="sector-tag">{selectedStock.sector}</span>
            </div>
            <h2 className="info-full-name">{selectedStock.asset_name}</h2>
            <div className="detail-grid">
              <div className="detail-stat">
                <label>Current Price</label>
                <p className="price-current">${Number(selectedStock.current_price).toFixed(2)}</p>
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
        <h3 className="panel-title">Trade Execution</h3>
        {selectedStock && (
          <div className="tmp">
            <p>Ready to trade {selectedStock.asset_symbol}?</p>
          </div>
        )}
      </div>
    </div>
  </>
);}