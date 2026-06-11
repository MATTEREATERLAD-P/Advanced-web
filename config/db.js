const mysql = require('mysql2/promise');
require('dotenv').config();

function parseConnectionString(connStr) {
  const url = new URL(connStr);
  return {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.replace('/', ''),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

const poolConfig = parseConnectionString(process.env.DB_CONNECTION_STRING);
const pool = mysql.createPool(poolConfig);

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log(`MySQL connected to ${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`);
    conn.release();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  }
})();

module.exports = pool;