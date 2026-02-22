import pkg from 'pg';
const { Client } = pkg;

async function syncStocks() {
  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const stockResponse = await client.query("SELECT asset_symbol FROM stocks ORDER BY stock_id ASC");
    const tickers = stockResponse.rows.map(r => r.asset_symbol);

    for (const ticker of tickers) {
      try {
        const response = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${process.env.FINNHUB_KEY}`);
        const data = await response.json();

        if (data && data.ticker) {
          const query = `
            UPDATE stocks 
            SET 
              sector = $1, 
              currency = $2, 
              website = $3,
              logo_url = $4,
            WHERE asset_symbol = $5
          `;

          const values = [
            data.finnhubIndustry,
            data.currency,
            data.weburl,
            data.logo,
            ticker
          ];

          await client.query(query, values);
        }
      } catch (e) {}
      await new Promise(res => setTimeout(res, 1000));
    }
  } catch (error) {
  } finally {
    await client.end();
  }
}

syncStocks();