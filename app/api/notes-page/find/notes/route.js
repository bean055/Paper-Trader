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

    const url = new URL(request.url);
    const folderId = Number(url.searchParams.get("folderId"));

    if (!folderId) {
      return NextResponse.json(
        { error: "folderId is required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT *
       FROM notes
       WHERE user_id = $1 AND folder_id = $2
       ORDER BY created_at DESC`,
      [userId, folderId]
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
