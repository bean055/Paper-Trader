import { NextResponse } from "next/server";
import pool from "../../../utilities/database.js";

export async function POST(request) {
  const client = await pool.connect();
  try {
    const { type, quantity, stockId } = await request.json();
    const sessionId = request.cookies.get("session_id")?.value;

    if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const initData = await client.query(
      `SELECT p.portfolio_id, p.balance, p.equity, p.total_value,
              s.current_price, s.recommendation_json
       FROM portfolios p
       JOIN users u ON p.user_id = u.user_id 
       JOIN stocks s ON s.stock_id = $2
       WHERE u.session_id = $1`,
      [sessionId, stockId]
    );

    if (initData.rows.length === 0) throw new Error("Data not found");

    const { 
      portfolio_id, 
      balance, 
      equity, 
      total_value,
      current_price, 
      recommendation_json: rec 
    } = initData.rows[0];

    const tradeValue = Number(current_price) * quantity;

    const totalRecs = (rec?.strongBuy || 0) + (rec?.buy || 0) + (rec?.hold || 0) + (rec?.sell || 0) + (rec?.strongSell || 0);
    let multiplier = 1.2;

    if (totalRecs > 0) {
      const score = ((rec.strongBuy * 1) + (rec.buy * 2) + (rec.hold * 3) + (rec.sell * 4) + (rec.strongSell * 5)) / totalRecs;
      if (score <= 2) multiplier = 0.75;
      else if (score <= 3) multiplier = 1.2;
      else if (score <= 4) multiplier = 2.0;
      else multiplier = 4.0;
    }

    await client.query('BEGIN');

    if (type === "BUY") {
      if (Number(balance) < tradeValue) throw new Error("Insufficient funds");

      const risk_value = (tradeValue / Number(total_value)) * 100 * multiplier;

      await client.query('UPDATE portfolios SET balance = balance - $1,equity = equity + $1 WHERE portfolio_id = $2', [tradeValue, portfolio_id]);
      
      await client.query(`
        INSERT INTO holdings (portfolio_id, stock_id, quantity, average_entry_price, last_risk_score)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (portfolio_id, stock_id) DO UPDATE SET 
          average_entry_price = (holdings.quantity * holdings.average_entry_price + $6) / (holdings.quantity + $3),
          last_risk_score = (holdings.quantity * holdings.last_risk_score + ($3 * $5)) / (holdings.quantity + $3),
          quantity = holdings.quantity + $3
      `, [portfolio_id, stockId, quantity, current_price, risk_value, tradeValue]);

      await client.query(
        `INSERT INTO trades 
          (portfolio_id, stock_id, quantity, price, trade_type, status, risk_value, rr_ratio, executed_at) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [portfolio_id, stockId, quantity, current_price, 'BUY', 'OPEN', risk_value, null, new Date()]
      );

    } else if (type === "SELL") {
      const holdingRes = await client.query(
        'SELECT quantity, average_entry_price, last_risk_score FROM holdings WHERE portfolio_id = $1 AND stock_id = $2',
        [portfolio_id, stockId]
      );

      if (!holdingRes.rows[0] || holdingRes.rows[0].quantity < quantity) throw new Error("Not enough shares");

      const { quantity: currentQty, average_entry_price, last_risk_score } = holdingRes.rows[0];
      
      const profitLoss = (Number(current_price) - Number(average_entry_price)) * quantity;
      const dollarRiskAtStake = (Number(total_value)* (Number(last_risk_score) / 100));
      const rr_ratio = dollarRiskAtStake !== 0 ? (profitLoss / dollarRiskAtStake).toFixed(2) : 0;

      const isFullSell = Number(currentQty) === Number(quantity);
      const tradeStatus = isFullSell ? 'CLOSED' : 'OPEN';

      await client.query('UPDATE portfolios SET balance = balance + $1,equity = equity - $1 WHERE portfolio_id = $2', [tradeValue, portfolio_id]);

      if (isFullSell) {
        await client.query('DELETE FROM holdings WHERE portfolio_id = $1 AND stock_id = $2', [portfolio_id, stockId]);
      } else {
        await client.query(
          'UPDATE holdings SET quantity = quantity - $1 WHERE portfolio_id = $2 AND stock_id = $3', 
          [quantity, portfolio_id, stockId]
        );
      }

      await client.query(
        `INSERT INTO trades 
        (portfolio_id, stock_id, quantity, price, trade_type, status, risk_value, rr_ratio, executed_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          portfolio_id, 
          stockId, 
          quantity, 
          current_price, 
          'SELL', 
          tradeStatus, 
          last_risk_score, 
          rr_ratio, 
          new Date()
        ]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}