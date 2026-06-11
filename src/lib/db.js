import mysql from "mysql2/promise";

let pool;

function getPool() {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.warn("DATABASE_URL is not defined. Using mock database client for build-time compilation.");
      return {
        query: async () => [[]],
        execute: async () => [[]],
      };
    }
    pool = mysql.createPool(dbUrl);
  }
  return pool;
}

const db = {
  query: (sql, params) => getPool().query(sql, params),
  execute: (sql, params) => getPool().execute(sql, params),
};

export default db;
