'use client';

import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "../../styles/pages/news.css";
import "../../styles/global.css";
import { manageAlert } from "../actions/alerts";

export default function Notes() {
  const [news, setNews] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [selectedNews, setSelectedNews] = useState(null);
  const router = useRouter();

  const fetchNewsPage = async () => {
    try {
        const response = await fetch('/api/news?type=all');

        if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fetch failed");
        }

        const data = await response.json();

        setNews(data.news || []);
        setAlerts(data.alerts || []);
        setWatchlist(data.watchlist || []);
        
    } catch (error) {
        console.error("eror on load", error.message);
    }
    };

  useEffect(() => {
    fetchNewsPage();
  }, []);

  const newsSelect = (article) => {
    console.log("Selected News:", article);
    setSelectedNews(article);
  };
  const handleTradeNavigation = (ticker) => {
    router.push(`/trade?symbol=${ticker}`);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };
  const formatCondition = (condition, value) => {
  const symbols = {
    'price_above': '>',
    'price_below': '<',
    'pct_change_positive': '+%',
    'pct_change_negative': '-%'
  };
  const symbol = symbols[condition] || condition;
  const formattedValue = parseFloat(value);

  return `${symbol} ${formattedValue}`;
};

  const alertClicked = async (alertItem) => {
    try {
      const result = await manageAlert({
        ticker: alertItem.ticker,
        condition: alertItem.condition_type, 
        value: alertItem.target_value,
      });

      if (result.success && result.status === 'deleted') {
        setAlerts((prev) => prev.filter((a) => a.alert_id !== alertItem.alert_id));
      }
    } catch (error) {
      console.error("Failed to remove alert:", error);
    }
  };

  const onSearch = async (ticker) => {
  try {
    if (!ticker) {
      fetchNewsPage();
      return;
    }
    const response = await fetch(`/api/news?type=news&ticker=${ticker.toUpperCase()}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Search failed");
    }
    const data = await response.json();
    setNews(data.news || []);
    
  } catch (error) {
    console.error("Error during search:", error.message);
  }
};

  return (
    <>
      <Navbar />
      <div className="news-page">
        <div className="news-panel">
          <div className="news-banner">
            <div className="banner-content">
              <h1>{selectedNews ? " " : "News"}</h1>
              <input type="text" className="search-news" placeholder="type a ticker..." 
              onKeyDown={(e) => {if (e.key === 'Enter') {onSearch(e.target.value);}}}/>

              {selectedNews && (
                <button className="back-button" onClick={() => setSelectedNews(null)}>
                  ← Back to List
                </button>
              )}
            </div>
          </div>

          {!selectedNews ? (
            <div className="news-list">
              {news.map((item) => (
                <div key={item.news_id} className="news-wrapper" onClick={() => newsSelect(item)}>
                  <div className="news-header">
                    <div className="news-left">
                      <h3>{item.headline}</h3>
                    </div>
                    <div className="news-right">
                      <span className="news-date">{formatTimestamp(item.published_at)}</span>
                      <span className="news-source">{item.source}</span>
                    </div>
                  </div>
                  <div className="news-body">
                    <p>{item.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="news-viewer">
              <h2 className="viewer-headline">{selectedNews.headline}</h2>
              <p className="viewer-meta">
                {selectedNews.source} - {formatTimestamp(selectedNews.published_at)}
              </p>
              <hr className="viewer-divider" />
              
              <div className="article-content">
                <p>{selectedNews.summary}</p>
                <a href={selectedNews.url} target="_blank" rel="noreferrer" className="external-link">
                  Read full article on {selectedNews.source} →
                </a>
              </div>
            </div>
          )}
        </div>

        <div className= "right-panel">
            <div className = "alerts-panel">
                <div className="alerts-banner">
                  <h1>Alerts</h1>
                </div>
                <div className = "alerts-list">
                    {alerts.map((alerts) => (
                        <div key = {alerts.alert_id} className="alerts-wrapper">
                            <h2>{alerts.ticker}</h2>
                            <span> {formatCondition(alerts.condition_type, alerts.target_value)}</span>
                            <div className="actions">
                              <button className="alerts-toggle "onClick={()=>alertClicked(alerts)} >
                              <img src="/eye.svg" alt="alerts-toggle"/>
                              </button> 
                              <button className="alert-link"onClick={()=>handleTradeNavigation(alerts.ticker)} >
                              <img src="/link-to.svg" alt="go-to"/>
                              </button>  
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className = "watchlist-panel">
              <div className="watchlist-banner">
                <h1>Watchlist</h1>
              </div>
                <div className = "watchlist-list">
                    {watchlist.map((watchlist) => (
                        <div key = {watchlist.watchlist_id} className="watchlist-wrapper">
                            <h2>{watchlist.ticker}</h2>
                            <div className="actions">
                              <button className="watchlist-toggle "onClick={()=>watchlistClicked()} >
                              <img src="/eye.svg" alt="watchlist-toggle"/>
                              </button> 
                              <button className="watchlist-link"onClick={()=>handleTradeNavigation(watchlist.ticker)} >
                              <img src="/link-to.svg" alt="go-to"/>
                              </button>      
                            </div>                  
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </>
  );
}
