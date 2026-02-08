import { NextResponse } from "next/server";
import pool from "../../../utilities/database.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { resend } from "../../../utilities/email.js";

export async function POST(request) {
  try {
    const { email, username, password } = await request.json();

    const exists = await pool.query(
      "SELECT 1 FROM users WHERE email = $1 OR username = $2",
      [email, username]
    );
    if (exists.rows.length) {
      return NextResponse.json(
        { error: "Email or username already taken" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userRes = await pool.query(
      `INSERT INTO users (email, username, password_hash, verified)
       VALUES ($1, $2, $3, FALSE)
       RETURNING user_id`,
      [email, username, passwordHash]
    );

    const userId = userRes.rows[0].user_id;

    await pool.query(
      `INSERT INTO portfolios (user_id)
       VALUES ($1)`,
      [userId]
    );

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(rawToken, 10);

    await pool.query(
      `INSERT INTO user_tokens (user_id, token_hash, token_type, expires_at)
       VALUES ($1, $2, 'email_verification', NOW() + INTERVAL '24 hours')`,
      [userId, tokenHash]
    );

    const verificationUrl =
      `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${rawToken}`;

    await resend.emails.send({
      from: "E-Paper Trader <onboarding@resend.dev>",
      to: email,
      subject: "Verify your email",
      html: `
        <p>Welcome to E-Paper Trader</p>
        <p>Click <a href="${verificationUrl}">here</a> to verify your email</p>
        <p>This link expires in 24 hours</p>
      `,
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
