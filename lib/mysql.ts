import mysql from "mysql2/promise";

const globalForMysql = globalThis as unknown as {
  mysqlPool?: mysql.Pool;
};

export const mysqlPool =
  globalForMysql.mysqlPool ??
  mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: Number(process.env.DB_PORT ?? 3306),
    connectionLimit: 10
  });

if (process.env.NODE_ENV !== "production") {
  globalForMysql.mysqlPool = mysqlPool;
}
