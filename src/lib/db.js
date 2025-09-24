import mysql from "mysql2/promise";

// Create the connection pool. The pool-specific settings are the defaults
const pool = mysql.createPool(process.env.DATABASE_URL);

export default pool;
