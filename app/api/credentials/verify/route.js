import { NextResponse } from "next/server";
import pool from "../../../utilities/database.js";
import bcrypt from "bcrypt";

export async function GET(request) {
  const client = await pool.connect(); 

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }
    const tokenResult = await client.query(
      `SELECT user_id, token_hash FROM user_tokens 
       WHERE token_type = 'email_verification' AND expires_at > NOW()`
    );
    let matchedUserId = null;
    for (const row of tokenResult.rows) {
      const isMatch = await bcrypt.compare(token, row.token_hash);
      if (isMatch) {
        matchedUserId = row.user_id;
        break;
      }
    }
    if (!matchedUserId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    await client.query("BEGIN");

    await client.query(
      `UPDATE users SET verified = TRUE WHERE user_id = $1`,
      [matchedUserId]
    );

    await client.query(
      `INSERT INTO portfolios (user_id, balance, equity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO NOTHING`,
      [matchedUserId, 10000, 0]
    );

    await client.query(
      `DELETE FROM user_tokens WHERE user_id = $1 AND token_type = 'email_verification'`,
      [matchedUserId]
    );

    await client.query("COMMIT");

    return NextResponse.json({ success: true, message: "Account verified" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Verification error:", err.message);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });

  } finally {
    client.release();
  }
}