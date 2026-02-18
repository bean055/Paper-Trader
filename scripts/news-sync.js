const { Client } = require('pg');

async function syncNews() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const response = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${process.env.FINNHUB_KEY}`);
    const newsItems = await response.json();

    for (const item of newsItems) {
      const query = `
        INSERT INTO news (finnhub_id, headline, summary, url, source, published_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (finnhub_id) 
        DO UPDATE SET headline = EXCLUDED.headline 
        RETURNING news_id;
      `;
      const values = [
        item.id.toString(),
        item.headline,
        item.summary,
        item.url,
        item.source,
        new Date(item.datetime * 1000)
      ];

      const res = await client.query(query, values);
      const newsId = res.rows[0]?.news_id;

      if (newsId && item.related) {
        const tickers = item.related.split(',').map(t => t.trim().toUpperCase());
        for (const ticker of tickers) {
          if (ticker) {
            await client.query(
              `INSERT INTO news_tickers (news_id, ticker)
               VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
              [newsId, ticker]
            );
          }
        }
      }
    }
    await client.query("DELETE FROM news WHERE published_at < NOW() - INTERVAL '14 days';");
    console.log("News sync completed.");

  } catch (error) {
    console.error("Sync Error:", error);
  } finally {
    await client.end();
  }
}

syncNews();