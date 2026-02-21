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
  const groupSize = 10;
  try {
    await client.connect();
    const stockResponse = await client.query("SELECT asset_symbol FROM stocks ORDER BY stock_id ASC");
    const tickers = stockResponse.rows.map(r => r.asset_symbol);

    for (let i = 0; i < tickers.length; i += groupSize) {
      const batch = tickers.slice(i, i + groupSize);

      await Promise.all(batch.map(async (ticker) => {
        try {
          const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${process.env.FINNHUB_KEY}`);
          const quote = await res.json();

          if (quote.c) {
            await client.query(
              "UPDATE stocks SET current_price = $1, last_price = $2, updated_at = NOW() WHERE asset_symbol = $3",
              [quote.c, quote.pc, ticker]
            );
          }
        } catch (e) {}
      }));

      if (i + groupSize < tickers.length) {
        await new Promise(r => setTimeout(r, 10000));
      }
    }
  } catch (error) {
  } finally {
    await client.end();
  }
}

syncStocks();