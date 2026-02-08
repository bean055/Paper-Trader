import { NextResponse } from "next/server";
import pool from "../../utilities/database.js";

export async function GET(request) {
    try {

        const sessionId = request.cookies.get("session_id")?.value;
        if (!sessionId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const userRes = await pool.query(
            "SELECT user_id FROM users WHERE session_id = $1", [sessionId]
        );
        if (!userRes.rows.length) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        const userId = userRes.rows[0].user_id;
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type") || "all";

        let responseData = {};

        if (type === "all" || type === "news") {
            const news = await pool.query(
                "SELECT * FROM news ORDER BY published_at DESC LIMIT 20"
            );
            responseData.news = news.rows;
        }

        if (type === "all" || type === "alerts") {
            const alerts = await pool.query(
                "SELECT * FROM alerts WHERE user_id = $1 AND is_active = TRUE", [userId]
            );
            responseData.alerts = alerts.rows;
        }

        if (type === "all" || type === "watchlist") {
            const watchlist = await pool.query(
                "SELECT * FROM watchlists WHERE user_id = $1", [userId]
            );
            responseData.watchlist = watchlist.rows;
        }

        return NextResponse.json(responseData);

    } catch (error) {
        console.error("Dashboard Route Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}