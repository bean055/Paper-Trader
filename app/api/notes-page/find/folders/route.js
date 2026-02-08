import { NextResponse } from "next/server";
import pool from "../../../../utilities/database.js";

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

    if (!userRes.rows.length) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = userRes.rows[0].user_id;

    const result = await pool.query(
      "SELECT * FROM folders WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
