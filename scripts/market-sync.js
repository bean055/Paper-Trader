const { Client } = require('pg');

async function syncNews() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false } 
  });

  try {
    await client.connect();
    console.log("Connected DB.");
    const response = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${process.env.FINNHUB_KEY}`);
    const newsItems = await response.json();

    for (const item of newsItems) {
      const query = `
        INSERT INTO news (finnhub_id, headline, summary, url, source, published_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (finnhub_id) DO NOTHING;
      `;
      const values = [
        item.id.toString(),
        item.headline,
        item.summary,
        item.url,
        item.source,
        new Date(item.datetime * 1000)
      ];

      const res = await client.query(newsQuery, newsValues);
      const newsId = res.rows[0].news_id;

      if (item.related) {
        const tickers = item.related.split(',').map(t => t.trim().toUpperCase());

        for (const ticker of tickers) {
          if (ticker) {
            const tickerQuery = 
            ` INSERT INTO news_tickers (news_id, ticker)
              VALUES ($1, $2)
              ON CONFLICT (news_id, ticker) DO NOTHING;
            `;
            await client.query(tickerQuery, [newsId, ticker]);
          }
        }
      }
    }
    console.log(" Complete.");
  } catch (err) {
    console.error(" Error:", err);
  } finally {
    await client.end();
  }
}

syncNews();
