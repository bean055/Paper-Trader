import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";
import pool from "../../../utilities/database.js"; 

export async function POST(request) {
  try {
    const { email, password} = await request.json();
    const sessionId = crypto.randomUUID();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing credentials" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT user_id, password_hash,verified FROM users WHERE email = $1`,
      [email]
      );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
      }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
      }
    if (!user.verified) {
      return NextResponse.json(
        { error: "Email not verified" },
        { status: 403 }
      );
    }
        await pool.query(
      `UPDATE users SET session_id = $1 WHERE user_id = $2`,
      [sessionId, user.user_id]
        );

    const response = NextResponse.json(
      { userId: user.user_id },
      { status: 200 }
    );

    response.cookies.set("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return response; 

  } catch (err) {
    console.error("Login error:", err.message, err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
