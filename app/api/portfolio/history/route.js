import { NextResponse } from "next/server";
import pool from "../../../utilities/database.js";

export async function GET(request) {
  const sessionId = request.cookies.get("session_id")?.value;
  
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("timeframe")) || 7;

  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const userRes = await pool.query(
      `SELECT portfolio_id FROM portfolios p
       JOIN users u ON p.user_id = u.user_id 
       WHERE u.session_id = $1`,
      [sessionId]
    );

    if (!userRes.rows.length) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }

    const portfolioId = userRes.rows[0].portfolio_id;

    const historyQuery = `
      SELECT recorded_at, balance_point, equity_point 
      FROM portfolio_history 
      WHERE portfolio_id = $1 
      AND recorded_at >= CURRENT_DATE - ($2 || ' days')::interval
      ORDER BY recorded_at ASC
    `;

    const historyResult = await pool.query(historyQuery, [portfolioId, days]);

    return NextResponse.json(historyResult.rows, { status: 200 });
    
  } catch (error) {
    console.error("Fetch History Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}