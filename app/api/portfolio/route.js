import { NextResponse } from "next/server";
import pool from "../../utilities/database.js";

export async function GET(request) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const userPortfolioRes = await pool.query(
      `SELECT p.portfolio_id, 
       u.username,
       p.balance, p.equity, p.total_value, p.risk_exposure, p.last_updated
       FROM portfolios p
       JOIN users u ON p.user_id = u.user_id 
       WHERE u.session_id = $1`,
      [sessionId]
    );

    if (!userPortfolioRes.rows.length) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }

    const portfolioData = userPortfolioRes.rows[0];
    const portfolioId = portfolioData.portfolio_id;

    const holdingsQuery = `
      SELECT h.holding_id,
        h.stock_id,
        h.quantity,
        h.average_entry_price,
        s.asset_symbol,
        s.asset_name,
        s.current_price,
        s.sector,
        s.low_52,
        s.high_52,
        s.eps,
        s.pe_ratio,
        s.dividend_yield,
        s.market_cap,
        (h.quantity * s.current_price) AS market_value,
        ((s.current_price - h.average_entry_price) * h.quantity) AS unrealised_pnl
      FROM holdings h
      JOIN stocks s ON h.stock_id = s.stock_id
      WHERE h.portfolio_id = $1
      ORDER BY market_value DESC
    `;

    const holdingsResult = await pool.query(holdingsQuery, [portfolioId]);

    return NextResponse.json(
      { 
        portfolio: portfolioData, 
        holdings: holdingsResult.rows 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Fetch Portfolio Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}