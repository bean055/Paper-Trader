'use client';
import { useEffect, useState } from "react";
import "../../styles/pages/trade.css"
import Navbar from "../components/Navbar"
import "../../styles/global.css";
import { useRouter } from "next/navigation";


export default function Home() {
  const [stocks, setStocks] = useState([]);
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchTradePage();
  },[page]);

  const fetchTradePage = async () => {
    const response = await fetch('/api/trades?page=${page}')
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fetch failed");
    }
    const data = await response.json();
    setStocks(data.stocks)
  }
  return (
    <>
    <Navbar/>
    <div className="trade-page">
      <div className="Stocks-panel">
        <h1> Stock list</h1>
        <div className="stock-list-container">
          {stocks.map((stocks) => (
            <div key={stocks.asset_symbol} className="stock-item">
              {stock.asset_symbol} - {stock.current_price}
            </div>
          ))}
        </div>
      </div>
      
      <div className ="watchlist-panel">

      </div>

      <div className="execution-panel">

      </div>

      <div className="info-panel">

      </div>
    </div>
    </>
  );
}
