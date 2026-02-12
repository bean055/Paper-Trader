'use server'
import pool from "../utilities/database.js";
import { cookies } from 'next/headers';

export async function manageWatchlist({ ticker}) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    const userRes = await pool.query(
      "SELECT user_id FROM users WHERE session_id = $1",
      [sessionId]
    );
    if (!userRes.rows.length) return { success: false, error: "Invalid Session" };
    const userId = userRes.rows[0].user_id;

    const check = await pool.query(
      'SELECT watchlist_id FROM watchlists WHERE user_id = $1 AND ticker = $2',
      [userId, ticker]
    );
    if (check.rows.length > 0) {
      await pool.query('DELETE FROM watchlists WHERE watchlist_id = $1', [check.rows[0].watchlist_id]);
      return { success: true, status: 'deleted' };
    } else {
      await pool.query(
        `INSERT INTO watchlists (user_id, ticker) 
         VALUES ($1, $2)`,
        [userId, ticker]
      );
      return { success: true, status: 'created' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}