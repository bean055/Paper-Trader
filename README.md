# E-Paper Trader
## A full-stack paper trading platform. Using Virtual currency this app enables and encourages a safe learning environment for trading featuring real stocks and live data and price changes and more. alongside the trading features are portfolio analytics, interactive charts, market news feeds, personal notes and a built-in learning environment.

**Why?** -> This was a coursework project. Inspired by my own initial interest with the topic, I wanted to recreate the fundamentals and mechanics of real online existing platforms (Trading212 and interactive broker) but powered by virtual capital and with a pivot towards a more educationally friendly platform. 

Beyond the topic itself, a primary goal was to build a complete end-to-end application using a **Broad, industry-standard tech stack** allowing me to work with and gain experience using API's, automation and complex Database schema and design all towards a working application.


| Area | Role |
| :--- | :--- |
| **Dashboard** |   _One page overview: equity curve, monthly performance, treemap and sector allocation of holdings, market movers (global or just your holdings), latest news, recent trades, watchlist._ |
| **Trade** | _Browse and search the stock choices view fundamentals and expert sentiments and place orders at live arket price_ |
| **Portfolio** | _Holdings with market value, unrealised P&L and exposure; Cash and equity over various timeframes as well as top gainers and loss_ |
| **Charts** | _Candlestick or line charts built from stored price history, a 20-period moving-average overlay, side-by-side dual view, and a drawing layer (freehand pen, crosshair ruler, undo/clear, copy-to-clipboard screenshot)._ |
| **Watchlist + Alerts** | _Watch tickers, and set alerts for price above/below a target or a percentage move up/down. Triggered alerts show up as toast notifications._ |
| **News** | _General market news with ticker tags, filterable per stock, with one-click jump to trade a mentioned ticker._ |
| **Learn** | _Glossary, learning modules with tutorials, and quizzes with scoring and saved progress and attempt history._ |
| **Notes** | _Folders and notes with colours, move between folders, and automatic numbering of untitled items._ |

***Techstack***
| Layer | Tech |
| :--- | :--- |
| **Frontend** |   _Next.js, React, Chart.js 4 Tailwind css, sonner for toasts notifications_ |
| **Backend** | _Next.js route handlers, Render for hosting, Finnhub WebSocket client_ |
| **Database** | _PostgreSQL_ |
| **Authentiaction** | _bCrypt,HttpOnly cookie sessions, Resend for email verification_ |
| **Market data** | _Finnhub REST API and WebSocket_ |
| **Backend** | _GitHub Actions scheduled workflow (cron jobs)_ |

### Data Sourcing paths ###
_***Batch*** -> scheduled GitHub Actions jobs pull quotes, fundamentals, analyst recommendations, company profiles and news into the database, and snapshot every portfolio's value once a day - the timeframes alter accordingly of the informations value._

_***Live*** -> the custom server holds one WebSocket connection to Finnhub, subscribes to the tracked symbols, and writes each symbol's latest trade price to Postgres. Writes are throttled to once per symbol every 2 minutes. Each update is also broadcast to a Socket.IO room named after the symbol._

### Technical highlights ###
***Transactional trade engine***

Every order runs inside a single SQL transaction (BEGIN / COMMIT / ROLLBACK) on a dedicated pooled client, so cash, holdings and the trade log can never drift apart if a step fails.

The user, portfolio and live price are fetched with one joined query keyed on the session cookie. The server always uses its own stored price, never one sent by the client.

Position averaging is done in SQL with an INSERT ... ON CONFLICT DO UPDATE, which recalculates the weighted-average entry price in one atomic statement. Sells reduce or delete the holding and mark the trade OPEN or CLOSED.

***Risk valuation and R:R tracking***

Each BUY is assigned a risk value: the position's share of total portfolio value, scaled by a multiplier derived from the analyst consensus for that stock. The score is weight-averaged across repeated buys of the same stock. On each SELL, the realised profit or loss is divided by the proportional dollar risk taken to record a risk-reward ratio on the trade, so you get feedback on position sizing, not only on profit.

***Real-time price pipeline***

Auto-reconnecting Finnhub WebSocket client with per-symbol write throttling, so a busy ticker cannot hammer the database.
Socket.IO rooms per symbol, so a client can subscribe to only the symbols it cares about.
Running this as a custom server (rather than serverless route handlers) is what makes a long-lived socket connection possible.

***Authentication and security***

Passwords hashed with bcrypt.
Email-verification and password-reset tokens are 32 random bytes; only a bcrypt hash of the token is stored, so a leaked database does not leak usable links. Tokens expire (24 hours for verification, 1 hour for reset) and are deleted once used.
Sessions are random UUIDs in an httpOnly, SameSite=Lax cookie (Secure in production, 7-day lifetime). Logout clears the cookie and invalidates the session server-side.
All queries are parameterised, and note and folder writes are scoped with AND user_id = $n so users can only touch their own data.
A new account only receives its portfolio and starting cash after the email is verified, inside the same transaction that marks it verified.

***Database design highlights***

Server-side session persistence. Each login generates a random UUID, stores it on the user’s row in Postgres, and sets it as an httpOnly, SameSite=Lax cookie (Secure in production, 7-day lifetime). Every API route and Server Action resolves the user by looking this ID up, so sessions survive server restarts and logout works instantly: it nulls the row’s session_id and clears the cookie. Because the state lives in the database rather than a stateless token, a session can be revoked at any time.

Atomic, server-priced orders. Every BUY or SELL runs inside a single SQL transaction (BEGIN / COMMIT / ROLLBACK) on one pooled client, so cash, holdings and the trade log either all update or none do. The user, portfolio and current price come from one joined query, and the order always executes at the price stored in the database, never one sent by the client. Position averaging is a single INSERT ... ON CONFLICT DO UPDATE that recalculates the weighted-average entry price inside the database.

Idempotent portfolio snapshots. The daily job calculates equity for every portfolio in one INSERT ... SELECT statement with joins and ON CONFLICT DO UPDATE. Re-running it on the same day overwrites that day’s row instead of duplicating it, so a retried or manually triggered job is always safe.

***Interactive charting tools***

Candlestick / line switching, a moving-average overlay, a dual-chart view, and a transparent canvas drawing layer on top of Chart.js. The screenshot feature composites the chart canvases and the drawing layer into one image and writes it to the clipboard through the async Clipboard API.




***Known limitations:***
Prices are as fresh as the live feed (written at most every 2 minutes per symbol) and the scheduled jobs, not tick-by-tick.
A user has one active session at a time; logging in on a second device replaces the first.

