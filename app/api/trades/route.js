import { NextResponse } from "next/server";
import pool from "../../utilities/database.js";

export async function GET(request) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

 try {
    const tradesQuery = `
      SELECT 
        t.trade_id,
        t.stock_id,
        s.asset_symbol AS symbol, 
        s.asset_name,
        t.trade_type, 
        t.quantity,
        t.price,
        t.trade_total,
        t.status,
        t.rr_ratio,
        t.executed_at
      FROM trades t
      JOIN stocks s ON t.stock_id = s.stock_id 
      JOIN portfolios p ON t.portfolio_id = p.portfolio_id
      JOIN users u ON p.user_id = u.user_id
      WHERE u.session_id = $1
      ORDER BY t.executed_at DESC
      LIMIT 5
    `;

    const res = await pool.query(tradesQuery, [sessionId]);
    return NextResponse.json({ trades: res.rows }, { status: 200 });

  } catch (error) {
    console.error("Trade History Error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch trade history" }, 
      { status: 500 }
    );
  }
}