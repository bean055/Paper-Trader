import { NextResponse } from "next/server";
import pool from "../../../utilities/database.js";

export async function GET(request) {
  try {
    const sessionId = request.cookies.get("session_id")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userRes = await pool.query(
      "SELECT user_id FROM users WHERE session_id = $1",
      [sessionId]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = userRes.rows[0].user_id;

    const setupQuery = `
      SELECT 
        p.balance, p.equity, p.total_return,
        h.quantity, h.average_entry_price,
        s.asset_symbol, s.current_price
      FROM portfolios p
      LEFT JOIN holdings h ON p.portfolio_id = h.portfolio_id
      LEFT JOIN stocks s ON h.stock_id = s.stock_id
      WHERE p.user_id = $1
    `;

    const res = await pool.query(setupQuery, [userId]);

    if (res.rows.length === 0) {
        return NextResponse.json({ balance: 0, holdings: [] });
    }

    const balance = res.rows[0].balance || 0;
    const holdings = res.rows
      .filter(row => row.asset_symbol !== null)
      .map(row => ({
        symbol: row.asset_symbol,
        quantity: row.quantity,
        avgPrice: row.average_entry_price,
        currentPrice: row.current_price
      }));

    return NextResponse.json({ balance, holdings });

  } catch (error) {
    console.error("DASHBOARD_SETUP_ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}