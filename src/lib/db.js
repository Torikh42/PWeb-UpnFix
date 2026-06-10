import mysql from "mysql2/promise";

const pool = mysql.createPool(process.env.DATABASE_URL || {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dummy'
});

export default pool;
