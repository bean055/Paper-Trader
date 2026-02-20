import { Socket } from "dgram";
import  Pool  from "utilities/database.js";

const {Server} = require("socket.io");
const WebSocket = require("ws")


const io = new Server(process.env.PORT || 3001, {
  cors: { origin: "https://paper-trader-1dj1p316t-bean055s-projects.vercel.app" } 
});
async function livePriceData(){
    try{
        const query = await Pool.query("SELECT asset_symbol FROM stocks LIMIT 50");
        const symbols = query.rows.map(row=> row.asset_symbol);
        console.log(`found ${symbols.join(",")}`);

    const finnhubSocket = new WebSocket(`wss://ws.finnhub.io?token=${process.env.FINNHUB_KEY}`)
        finnhubSocket.on("open", () => {
            symbols.forEach(sym => {
                finnhubSocket.send(JSON.stringify({ type: "subscribe", symbol: sym }));
            });
        });

    finnhubSocket.on("message", async (data) => {
      const parsed = JSON.parse(data);
      if (parsed.type === "trade") {
        const { s: symbol, p: price } = parsed.data[0];

        await pool.query(
          "UPDATE stocks SET current_price = $1, last_updated = NOW() WHERE asset_symbol = $2",
          [price, symbol]
        );
        io.to(symbol).emit("price ", { symbol, price });
      }
    });

    finnhubSocket.on("close", () => {
      console.log("connection lost. Reconnecting");
      setTimeout(startLiveHub, 5000);
    });

  } catch (err) {
    console.error("Initialization Error:", err);
  }
}
livePriceData();