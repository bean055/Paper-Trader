import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "../../../utilities/database.js";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    if (sessionId) {
      await pool.query(
        `UPDATE users SET session_id = NULL WHERE session_id = $1`,
        [sessionId]
      );
    }
    const response = NextResponse.json(
      { status: 200 }
    );

    response.cookies.set("session_id", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { status: 500 }
    );
  }
}