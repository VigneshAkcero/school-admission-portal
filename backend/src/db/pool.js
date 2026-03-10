const { Pool } = require("pg");
const config = require("../config");

const pool = new Pool({
  connectionString: config.dbUrl,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

pool.on("connect", (client) => {
  client.query("SET TIME ZONE 'Asia/Kolkata'").catch(() => undefined);
});

module.exports = pool;
