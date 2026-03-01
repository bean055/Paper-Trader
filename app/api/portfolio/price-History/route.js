import { NextResponse } from "next/server";
import pool from "../../../utilities/database.js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const timeframe = parseInt(searchParams.get("timeframe")) || 7;
  const id = searchParams.get("stock_id");

  if (!id) {
    return NextResponse.json({ error: "Stock ID is required" }, { status: 400 });
  }

  try {
    const query = `
      SELECT 
        date_trunc('day', created_at) AS day,
        MIN(price) AS low,
        MAX(price) AS high,
        (ARRAY_AGG(price ORDER BY created_at ASC))[1] AS open,
        (ARRAY_AGG(price ORDER BY created_at DESC))[1] AS close
      FROM price_history 
      WHERE stock_id = $1 
      AND created_at >= CURRENT_DATE - ($2 || ' days')::interval
      GROUP BY day
      ORDER BY day ASC
    `;

    const result = await pool.query(query, [id, timeframe]);

    const formattedData = result.rows.map(row => ({
      date: row.day,
      open: parseFloat(row.open),
      high: parseFloat(row.high),
      low: parseFloat(row.low),
      close: parseFloat(row.close)
    }));

    return NextResponse.json(formattedData, { status: 200 });
  } catch (error) {
    console.error("Stock History Error:", error);
    return NextResponse.json({ error: "Failed to fetch stock history" }, { status: 500 });
  }
}