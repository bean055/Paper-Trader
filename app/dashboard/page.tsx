'use client';
import { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import "../../styles/pages/dashboard.css"; 

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState({ balance: 0, holdings: [] });
  const [stocks, setStocks] = useState([]);

  const fetchUserAccount = useCallback(async () => {
    try {
      const res = await fetch('/api/credentials/setup');
      const data = await res.json();
      setPortfolio({
        balance: data.balance ?? 0,
        holdings: data.holdings ?? []
      });
    } catch (err) {
      console.error("Account sync failed:", err);
    } finally {
    }
  }, []);

  const fetchMarketData = async () => {
    try {
      const res = await fetch('/api/trades/fetch?page=1');
      if (res.ok) {
        const data = await res.json();
        setStocks(data.stocks || []);
      }
    } catch (e) { 
      console.error("Market fetch failed", e); 
    }
  };

  useEffect(() => {
    fetchUserAccount(); 
    fetchMarketData();  
  }, [fetchUserAccount]);

  return (
    <>
      <Navbar />
      <div className="Dashboard-page"> 
        <div className="account-info">
          <h2>Balance ${Number(portfolio.balance).toLocaleString()}</h2>
          <p>Unique Stocks Owned {portfolio.holdings?.length || 0}</p>
          <hr />         
                 
        </div>
      </div>
    </>
  );
}