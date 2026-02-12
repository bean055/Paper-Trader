import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "../../utilities/database.js";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userRes = await pool.query(
      "SELECT user_id FROM users WHERE session_id = $1",
      [sessionId]
    );

    if (!userRes.rows.length) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = userRes.rows[0].user_id;

    const checkQuery = `
      SELECT 
        alerts.alert_id, 
        alerts.ticker, 
        alerts.target_value, 
        stocks.current_price, 
        alerts.condition_type
      FROM alerts 
      JOIN stocks ON alerts.ticker = stocks.asset_symbol
      WHERE alerts.user_id = $1 
        AND alerts.last_triggered_at IS NULL
        AND (
            (alerts.condition_type = 'price_above' AND stocks.current_price >= alerts.target_value) OR
            (alerts.condition_type = 'price_below' AND stocks.current_price <= alerts.target_value) OR
            (alerts.condition_type = 'pct_change_positive' AND ((stocks.current_price - stocks.last_price) / stocks.last_price) * 100 >= alerts.target_value) OR
            (alerts.condition_type = 'pct_change_negative' AND ((stocks.current_price - stocks.last_price) / stocks.last_price) * 100 <= -alerts.target_value)
      );`;

    const { rows: hitAlerts } = await pool.query(checkQuery, [userId]);

    if (hitAlerts.length > 0) {
      const ids = hitAlerts.map(alerts => alerts.alert_id);
      
      await pool.query(
        "UPDATE alerts SET last_triggered_at = NOW() WHERE alert_id = ANY($1)",
        [ids]
      );

      return NextResponse.json({ triggered: true, alerts: hitAlerts });
    }

    return NextResponse.json({ triggered: false, alerts: [] });
  } catch (error) {
    console.error("werror", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}