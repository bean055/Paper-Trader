const { Client } = require('pg');

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
    const stockResponse = await client.query("SELECT asset_symbol FROM stocks");
    const tickers = stockResponse.rows.map(r => r.asset_symbol);
    let updatedCount = 0;

    for (const ticker of tickers) {
      const quoteResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${process.env.FINNHUB_KEY}`);
      const quote = await quoteResponse.json();

      if (quote.c) {
        const updateQuery = `
          UPDATE stocks 
          SET 
            current_price = $1, 
            last_price = $2, 
            updated_at = NOW() 
          WHERE asset_symbol = $3
        `;

        const values = [
          quote.c,
          quote.pc,
          ticker
        ];

        await client.query(updateQuery, values);
        updatedCount++;
        console.log(`[${updatedCount}/${tickers.length}] Updated ${ticker}: $${quote.c}`);
      }

      await new Promise(res => setTimeout(res, 250));
    }

  } catch (error) {
    console.error("Stock Sync Error  ", error);
  } finally {
    await client.end();
  }
}

syncStocks();