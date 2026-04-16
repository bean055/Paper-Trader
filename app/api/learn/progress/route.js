import { NextResponse } from "next/server";
import pool from "../../../utilities/database.js";

export async function GET(request) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const userRes = await pool.query(
      `SELECT user_id FROM users WHERE session_id = $1`,
      [sessionId]
    );

    if (!userRes.rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = userRes.rows[0].user_id;

    const quizzes = await pool.query(`
        SELECT 
        quiz_id,
        BOOL_OR(passed) AS passed,
        COALESCE(MAX(score), 0) AS best_score
        FROM user_quiz_attempts
        WHERE user_id = $1
        GROUP BY quiz_id
    `, [userId]);

    const quizMap = {};
    quizzes.rows.forEach(q => {
      quizMap[q.quiz_id] = {
        passed: q.passed,
        bestScore: q.best_score
      };
    });

    const moduleRes = await pool.query(
      `SELECT *
       FROM user_module_progress
       WHERE user_id = $1`,
      [userId]
    );

    const attemptsRes = await pool.query(
      `SELECT *
       FROM user_quiz_attempts
       WHERE user_id = $1
       ORDER BY attempted_at DESC`,
      [userId]
    );

    return NextResponse.json({
      attempts: attemptsRes.rows,
      moduleProgress: moduleRes.rows,
      quizzes: quizMap
    });

  } catch (err) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}


export async function POST(request) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const userRes = await pool.query(
      `SELECT user_id
       FROM users
       WHERE session_id = $1`,
      [sessionId]
    );

    if (!userRes.rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = userRes.rows[0].user_id;

    const body = await request.json();

    if (body.type === "quiz") {
      await pool.query(
        `INSERT INTO user_quiz_attempts
         (user_id, quiz_id, score, passed, attempted_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, body.quizId, body.score, body.passed]
      );

      return NextResponse.json({ success: true });
    }

    if (body.type === "module") {
    await pool.query(
        `
        INSERT INTO user_module_progress (user_id, module_id, completed, completed_at)
        VALUES ($1, $2, $3, CASE WHEN $3 THEN NOW() ELSE NULL END)
        ON CONFLICT (user_id, module_id)
        DO UPDATE SET
        completed = EXCLUDED.completed,
        completed_at = CASE 
            WHEN EXCLUDED.completed THEN NOW()
            ELSE NULL
        END
        `,
        [userId, body.moduleId, body.completed]
    );

    return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  } catch (err) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}