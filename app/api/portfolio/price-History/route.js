import { NextResponse } from "next/server";
import pool from "../../../utilities/database.js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const timeframe = parseInt(searchParams.get("timeframe")) || "7";
  const id = searchParams.get("stock_id");
  const assetsymbol = searchParams.get("asset_symbol");
  if (!id && !assetsymbol) {
    return NextResponse.json(
      { error: "Either stock_id or asset_symbol is required" }, 
      { status: 400 }
    );
  }

  try {
    let query;
    let queryParams;

    if (id) {
      query = `
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
      queryParams = [id, timeframe];
    } else {
      query = `
        SELECT 
          date_trunc('day', ph.created_at) AS day,
          MIN(ph.price) AS low,
          MAX(ph.price) AS high,
          (ARRAY_AGG(ph.price ORDER BY ph.created_at ASC))[1] AS open,
          (ARRAY_AGG(ph.price ORDER BY ph.created_at DESC))[1] AS close
        FROM price_history ph
        JOIN stocks s ON ph.stock_id = s.stock_id
        WHERE s.asset_symbol = $1 
        AND ph.created_at >= CURRENT_DATE - ($2 || ' days')::interval
        GROUP BY 1, s.asset_symbol
        ORDER BY day ASC
      `;
      queryParams = [assetsymbol, timeframe];
    }

    const result = await pool.query(query, queryParams);

    const formattedData = result.rows.map(row => ({
      date: row.day,
      open: parseFloat(row.open),
      high: parseFloat(row.high),
      low: parseFloat(row.low),
      close: parseFloat(row.close)
    }));

    return NextResponse.json(formattedData, { status: 200 });
 } catch (error) {
    return NextResponse.json({ 
      error: error.message, 
      stack: error.stack 
    }, { status: 500 });
  }
}