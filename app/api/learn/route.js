import { NextResponse } from "next/server";
import pool from "../../utilities/database.js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const id = searchParams.get('id');

  try {
    if (category === "glossary") {
      const result = await pool.query("SELECT term, definition FROM glossary ORDER BY term ASC");
      return NextResponse.json(result.rows);
    }

    if (!category) return NextResponse.json({ error: "Category required" }, { status: 400 });

    if (!id) {
      let listQuery = "";
      switch (category) {
        case "learning modules":
          listQuery = "SELECT module_id AS id, module_title AS title FROM learning_modules ORDER BY order_index";
          break;
        case "quizzes":
          listQuery = "SELECT quiz_id AS id, title FROM quizzes";
          break;

        default: return NextResponse.json([]);
      }
      const result = await pool.query(listQuery);
      return NextResponse.json(result.rows);
    }

    // GET CONTENT 
    let contentQuery = "";
    if (category === "learning modules") {
      const result = await pool.query(`
        SELECT 
          m.*, 
          (
            SELECT json_agg(t.* ORDER BY t.tutorial_id) 
            FROM tutorials t 
            WHERE t.module_id = m.module_id
          ) AS tutorials
        FROM learning_modules m 
        WHERE m.module_id = $1
      `, [id]);
      
      return NextResponse.json(result.rows[0]);
    }


    if (category === "quizzes") {
      const quizInfo = await pool.query("SELECT * FROM quizzes WHERE quiz_id = $1", [id]);
      
      const questionsAndAnswers = await pool.query(`
        SELECT 
          q.question_id, 
          q.question_text, 
          q.question_type, 
          q.order_index,
          json_agg(
            json_build_object(
              'option_id', a.option_id, 
              'option_text', a.option_text, 
              'is_correct', a.is_correct
            )
          ) AS options
        FROM questions q
        LEFT JOIN answers a ON q.question_id = a.question_id
        WHERE q.quiz_id = $1
        GROUP BY q.question_id
        ORDER BY q.order_index ASC
      `, [id]);

      return NextResponse.json({
        ...quizInfo.rows[0],
        questions: questionsAndAnswers.rows
      });
    }

    const contentResult = await pool.query(contentQuery, [id]);
    return NextResponse.json(contentResult.rows[0]);

  } catch (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}