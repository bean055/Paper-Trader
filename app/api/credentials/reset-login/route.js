import { NextResponse } from "next/server";
import pool from "../../../utilities/database.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { resend } from "../../../utilities/email.js";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const userRes = await pool.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userId = userRes.rows[0].user_id;

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(rawToken, 12);

    await pool.query(
      `INSERT INTO user_tokens (user_id, token_hash, token_type, expires_at)
       VALUES ($1, $2, 'password_reset', NOW() + INTERVAL '1 hour')`,
      [userId, tokenHash]
    );

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${rawToken}`;

    const sendResult = await resend.emails.send({
      from: "E-Paper Trader <onboarding@resend.dev>",
      to: email,
      subject: "Reset your password",
      html: `
        <p>You requested a password reset</p>
        <p>Click <a href="${resetUrl}">here</a> to reset your password</p>
        <p>This link expires in 1 hour</p>
        <p>If you did not request this, ignore this email</p>
      `,
    });

    if (sendResult.error) {
      throw new Error(`Email send failed: ${sendResult.error.message}`);
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Password reset error:", err.message, err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token and new password are required" },
        { status: 400 }
      );
    }

    const tokenResult = await pool.query(
      `SELECT user_id, token_hash FROM user_tokens 
       WHERE token_type = 'password_reset' AND expires_at > NOW()`,
      []
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    let userId = null;
    for (const row of tokenResult.rows) {
      const isMatch = await bcrypt.compare(token, row.token_hash);
      if (isMatch) {
        userId = row.user_id;
        break;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await pool.query(
      `UPDATE users SET password_hash = $1,updated_at = NOW()
      WHERE user_id = $2`,
      [passwordHash, userId]
    );


    await pool.query(
      `DELETE FROM user_tokens WHERE user_id = $1 
      AND token_type = 'password_reset'`,
      [userId]
    );

    return NextResponse.json({ success: true, message: "Password updated successfully" });

  } catch (err) {
    console.error("Password change error:", err.message, err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
