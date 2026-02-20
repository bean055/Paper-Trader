import Pool from "./database.js";
import WebSocket from "ws";
import { Server } from "socket.io";
import { createServer } from "http";
import { parse } from "url";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = process.env.PORT;

app.prepare().then(() => {
  const httpServer = createServer((request, response) => {
    const parsedURL = parse(request.url, true);
    handle(request, response, parsedURL);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  async function livePriceData() {
    try {
      const query = await Pool.query("SELECT asset_symbol FROM stocks LIMIT 50");
      const symbols = query.rows.map(row => row.asset_symbol);
      console.log(`found ${symbols.join(",")}`);

      const finnhubSocket = new WebSocket(`wss://ws.finnhub.io?token=${process.env.FINNHUB_KEY}`);

      finnhubSocket.on("open", () => {
        symbols.forEach(sym => {
          finnhubSocket.send(JSON.stringify({ type: "subscribe", symbol: sym }));
        });
      });

      finnhubSocket.on("message", async (data) => {
        const parsed = JSON.parse(data);
        if (parsed.type === "trade") {
          const { s: symbol, p: price } = parsed.data[0];
          await Pool.query(
            "UPDATE stocks SET current_price = $1, last_updated = NOW() WHERE asset_symbol = $2",
            [price, symbol]
          );
          io.to(symbol).emit("price-update", { symbol, price });
        }
      });

      finnhubSocket.on("error", (err) => {
        console.error("Finnhub Error:", err.message);
      });

      finnhubSocket.on("close", () => {
        console.log("Reconnecting");
        setTimeout(livePriceData, 5000);
      });
    } catch (err) {
      console.error("Initialization Error", err);
    }
  }

  io.on("connection", (socket) => {
    socket.on("join-stock", (symbol) => {
      socket.join(symbol);
    });
  });

  httpServer.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`ready on port ${PORT}`);
    livePriceData();
  });
});