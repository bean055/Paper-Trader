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
    await client.query("DELETE FROM price_history WHERE created_at < NOW() - INTERVAL '6 months'");

    const stockResponse = await client.query("SELECT asset_symbol, stock_id FROM stocks ORDER BY stock_id ASC");
    const stocks = stockResponse.rows; 

    for (let i = 0; i < stocks.length; i += groupSize) {
      const batch = stocks.slice(i, i + groupSize);
      await Promise.all(batch.map(async (stock) => {
        try {
          const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${stock.asset_symbol}&token=${process.env.FINNHUB_KEY}`);
          const quote = await res.json();

          if (quote.c) {
            await client.query('BEGIN'); 
            
            await client.query(
              "UPDATE stocks SET current_price = $1, last_price = $2, updated_at = NOW() WHERE asset_symbol = $3",
              [quote.c, quote.pc, stock.asset_symbol]
            );
            await client.query(
              "INSERT INTO price_history (stock_id, price, created_at) VALUES ($1, $2, NOW())",
              [stock.stock_id, quote.c]
            );

            await client.query('COMMIT');
          }
        } catch (e) {
          await client.query('ROLLBACK'); 
          console.error(`Error syncing ${stock.asset_symbol}:`, e);
        }
      }));

      if (i + groupSize < stocks.length) {
        await new Promise(r => setTimeout(r, 10000));
      }
    }
  } catch (error) {
    console.error("Global Sync Error:", error);
  } finally {
    await client.end();
  }
}

syncStocks();