import { NextResponse } from "next/server";
import pool from "../../../utilities/database.js";
import bcrypt from "bcrypt";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Missing verification token" },
        { status: 400 }
      );
    }

    const tokenResult = await pool.query(
      `SELECT user_id, token_hash, expires_at FROM user_tokens 
       WHERE token_type = 'email_verification' AND expires_at > NOW()`,
      []
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    let matchedUserId = null;
    for (const row of tokenResult.rows) {
      const isMatch = await bcrypt.compare(token, row.token_hash);
      if (isMatch) {
        matchedUserId = row.user_id;
        break;
      }
    }

    if (!matchedUserId) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      );
    }

    await pool.query(
      `UPDATE users SET verified = TRUE WHERE user_id = $1`,
      [matchedUserId]
    );

    await pool.query(
      `DELETE FROM user_tokens WHERE user_id = $1 AND token_type = 'email_verification'`,
      [matchedUserId]
    );

    return NextResponse.json({ success: true, message: "Email verified!" });

  } catch (err) {
    console.error("Verification error:", err.message, err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
