'use server'
import { Client } from 'pg';
import pool from "../utilities/database.js";
import { cookies } from 'next/headers';

export async function manageAlert({ ticker, condition, value}) {
  const client = await pool.connect();

  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    const userRes = await pool.query(
      "SELECT user_id FROM users WHERE session_id = $1",
      [sessionId]
    );
    if (!userRes.rows.length) return { success: false, error: "Invalid Session" };
    const userId = userRes.rows[0].user_id;

    const check = await client.query(
      'SELECT alert_id FROM alerts WHERE user_id = $1 AND ticker = $2 AND condition_type = $3 AND target_value = $4',
      [userId, ticker, condition, value]
    );

    if (check.rows.length > 0) {
      await client.query('DELETE FROM alerts WHERE alert_id = $1', [check.rows[0].alert_id]);
      return { success: true, status: 'deleted' };
    } else {
      await client.query(
        `INSERT INTO alerts (user_id, ticker, condition_type, target_value) 
         VALUES ($1, $2, $3, $4)`,
        [userId, ticker, condition, value]
      );
      return { success: true, status: 'created' };
    }
  } catch (err) {
    console.error("Alert Logic Error:", err);
    return { success: false, error: err.message };
  } finally {
    client.release(); 
  }
}