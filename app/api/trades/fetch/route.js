import { NextResponse } from "next/server";
import pool from "../../../utilities/database.js"

export async function GET() {
  try {
    const query = `
      SELECT 
        stock_id, 
        asset_symbol, 
        asset_name, 
        current_price, 
        last_price, 
        sector 
      FROM stocks 
      ORDER BY asset_symbol ASC
    `;

    const result = await pool.query(query);

    return Response.json(
      { stocks: result.rows },
      {
        status: 200,
        headers: {
        },
      }
    );
  } catch (error) {
    console.error("Fetch Stocks Error:", error);
    return Response.json({ error: "Failed to fetch stocks" }, { status: 500 });
  }
}