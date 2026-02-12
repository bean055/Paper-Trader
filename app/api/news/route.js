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
        const ticker = searchParams.get("ticker");

        let responseData = {};

        if (type === "all" || type === "news") {
            let newsRows = [];

            if (ticker) {
                const newsRes = await pool.query(
                `SELECT n.* FROM news n 
                JOIN news_tickers nt ON n.news_id = nt.news_id 
                WHERE nt.ticker = $1 
                ORDER BY n.published_at DESC LIMIT 20`, 
                [ticker]
                );
                newsRows = newsRes.rows;
            } else {
                const newsRes = await pool.query(
                "SELECT * FROM news ORDER BY published_at DESC LIMIT 20"
                );
                newsRows = newsRes.rows;
                }
            responseData.news = newsRows;
        }
        if (type === "all") {
            const alerts = await pool.query(
                "SELECT * FROM alerts WHERE user_id = $1 AND is_active = TRUE", [userId]
            );
            responseData.alerts = alerts.rows;
        
            const watchlist = await pool.query(
            `SELECT
                watchlists.ticker, 
                stocks.current_price, 
                stocks.last_price,
                ((stocks.current_price - stocks.last_price) / stocks.last_price * 100) AS percent_change
            FROM watchlists
            JOIN stocks ON watchlists.ticker = stocks.asset_symbol
            WHERE watchlists.user_id = $1
            ORDER BY percent_change DESC`,          
            [userId]
            );
            responseData.watchlist = watchlist.rows;
        }

        return NextResponse.json(responseData);

    } catch (error) {
        console.error("route error", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}