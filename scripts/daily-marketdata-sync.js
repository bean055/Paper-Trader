import pkg from 'pg';
const { Client } = pkg;
import pLimit from 'p-limit';
async function syncDaily() {
 const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  ssl: { rejectUnauthorized: false }
});

const limit = pLimit(5);

  try {
    await client.connect();
    const stockResponse = await client.query("SELECT asset_symbol FROM stocks");
    const tickers = stockResponse.rows.map(r => r.asset_symbol);

    const tasks = tickers.map(ticker => limit(async () => {
      try {
        const [finRes, recRes] = await Promise.all([
          fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${process.env.FINNHUB_KEY}`),
          fetch(`https://finnhub.io/api/v1/stock/recommendation?symbol=${ticker}&token=${process.env.FINNHUB_KEY}`)
        ]);
        const fin = await finRes.json();
        const recData = await recRes.json();
        return { 
          ticker, 
          m: fin.metric, 
          rec: recData[0] || {} 
        };
      } catch (err) {
        console.error(`Failed to fetch data for ${ticker}:`, err.message);
        return null;
      }
    }));

    const results = await Promise.all(tasks);
    await client.query('BEGIN');
    for (const result of results) {
      if (result && result.m) {
        const { ticker, m, rec } = result;
        const query = `
          UPDATE stocks SET 
            market_cap = $1, pe_ratio = $2, high_52 = $3, 
            low_52 = $4, dividend_yield = $5, eps = $6, 
            recommendation_json = $7, updated_at = NOW() 
          WHERE asset_symbol = $8
        `;
        const values = [
          m.marketCapitalization,
          m.peExclExtraTTM,
          m['52WeekHigh'],
          m['52WeekLow'],
          m.dividendYieldIndicatedAnnual,
          m.epsExclExtraItemsTTM,
          JSON.stringify(rec),
          ticker
        ];
        await client.query(query, values);
      }
    }
    const historyQuery = `
      INSERT INTO portfolio_history (portfolio_id, balance_point, equity_point, recorded_at)
      SELECT 
        p.portfolio_id, 
        p.balance, 
        (p.balance + COALESCE(SUM(h.quantity * s.current_price), 0)) as total_equity,
        CURRENT_DATE
      FROM portfolios p
      LEFT JOIN holdings h ON p.portfolio_id = h.portfolio_id
      LEFT JOIN stocks s ON h.stock_id = s.stock_id
      GROUP BY p.portfolio_id, p.balance
      ON CONFLICT (portfolio_id, recorded_at) 
      DO UPDATE SET 
        balance_point = EXCLUDED.balance_point,
        equity_point = EXCLUDED.equity_point;
    `;
    await client.query(historyQuery);

    await client.query(`DELETE FROM portfolio_history WHERE recorded_at < CURRENT_DATE - INTERVAL '180 days'`);

    await client.query('COMMIT');
    console.log("Daily sync completed");

  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Sync Error - Rolled Back:", e);
  } finally {
    await client.end();
  }
}

syncDaily();