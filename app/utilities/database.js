import { Pool } from "pg";

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: 20,
  connectionTimeoutMillis: 15000, 
idleTimeoutMillis: 30000        

});

export default pool;
