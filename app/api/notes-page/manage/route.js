import { NextResponse } from "next/server";
import pool from "../../../utilities/database.js";

export async function POST(req) {

  try {
    const body = await req.json();
    const { action, type, id, data } = body;
    
    if (!action || !type) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const sessionId = req.cookies.get("session_id")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userResponse = await pool.query(
      "SELECT user_id FROM users WHERE session_id = $1",
      [sessionId]
    );

    if (!userResponse.rows.length) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = userResponse.rows[0].user_id;

    if (action === "delete") {
      if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
      }

      if (type === "note") {
        await pool.query(
          "DELETE FROM notes WHERE note_id = $1 AND user_id = $2",
          [id, userId]
        );
      } else if (type === "folder") {
        await pool.query(
          "DELETE FROM folders WHERE folder_id = $1 AND user_id = $2",
          [id, userId]
        );
      } else {
        return NextResponse.json({ error: "Invalid type for delete" }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "update") {
      if (!id || !data) {
        return NextResponse.json({ error: "Missing id or data" }, { status: 400 });
      }

      if (type === "note") {
        const { title, content, colour, folder_id } = data;

        await pool.query(
          `UPDATE notes
           SET title = COALESCE($1, title),
               content = COALESCE($2, content),
               colour = $3,
               folder_id = $4,
               updated_at = NOW()
           WHERE note_id = $5 AND user_id = $6`,
          [title, content, colour || null, folder_id || null, id, userId]
        );
      } else if (type === "folder") {
        const { folder_title } = data;

        await pool.query(
          "UPDATE folders SET folder_title = $1 WHERE folder_id = $2 AND user_id = $3",
          [folder_title, id, userId]
        );
      } else {
        return NextResponse.json({ error: "Invalid type for update" }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "create") {
      if (!data) {
        return NextResponse.json({ error: "Missing data" }, { status: 400 });
      }

      if (type === "note") {
        const { title, content, colour, folder_id } = data;

        const countResponse = await pool.query(
          "SELECT COUNT(*) FROM notes WHERE user_id = $1",
          [userId]
        );

        const noteNumber = Number(countResponse.rows[0].count) + 1;
        const isGeneric = !title || title.trim() === "" || title === "New Note";
        const finalTitle = isGeneric ? `New Note #${noteNumber}`: title.trim();

        const response = await pool.query(
          `INSERT INTO notes (user_id, folder_id, title, content, colour, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING *`,
          [userId, folder_id || null, finalTitle, content || "", colour || null]
        );

        return NextResponse.json({ success: true, note: response.rows[0] });
      }

      if (type === "folder") {
        const { folder_title } = data;

        const countResponse = await pool.query(
          "SELECT COUNT(*) FROM folders WHERE user_id = $1",
          [userId]
        );

        const folderNumber = Number(countResponse.rows[0].count) + 1;
        const isGeneric = !folder_title || folder_title.trim() === "" || folder_title === "New Folder";
        const finalTitle = isGeneric ? `New Folder #${folderNumber}` : folder_title.trim();

        const response = await pool.query(
          `INSERT INTO folders (user_id, folder_title, created_at)
           VALUES ($1, $2, NOW())
           RETURNING *`,
          [userId, finalTitle]
        );

        return NextResponse.json({ success: true, folder: response.rows[0] });
      }

      return NextResponse.json({ error: "Invalid type for create" }, { status: 400 });
    }

    if (action === "move") {
      if (type !== "note") {
        return NextResponse.json(
          { error: "Move action only supported for notes" },
          { status: 400 }
        );
      }

      if (!id || !("folder_id" in data)) {
        return NextResponse.json(
          { error: "Missing note id or target folder_id" },
          { status: 400 }
        );
      }

      await pool.query(
        `UPDATE notes
        SET folder_id = $1,
            updated_at = NOW()
        WHERE note_id = $2
          AND user_id = $3`,
        [data.folder_id || null, id, userId]
      );

      return NextResponse.json({ success: true });
    }


    return NextResponse.json({ error: "Invalid action" }, { status: 400 });} 
    catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
