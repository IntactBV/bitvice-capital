import mysql from "mysql2/promise";


export type DbConfig = {
  host: string;
  port?: number;
  user: string;
  password?: string;
  database?: string;
};

const globalForMysql = globalThis as unknown as {
  mysqlPool?: mysql.Pool;
};

export function parseDatabaseUrl(url: string): DbConfig | null {
  try {
    const u = new URL(url);
    if (!u.hostname || !u.username) return null;
    return {
      host: u.hostname,
      port: u.port ? Number(u.port) : undefined,
      user: decodeURIComponent(u.username),
      password: u.password ? decodeURIComponent(u.password) : undefined,
      database: u.pathname?.replace(/^\//, "") || undefined,
    };
  } catch {
    return null;
  }
}

export function getDbConfigFromEnv(): DbConfig | null {
  if (process.env.DB_URI) {
    const parsed = parseDatabaseUrl(process.env.DB_URI);
    if (parsed) return parsed;
  }


  const host = process.env.MYSQL_HOST || process.env.DB_HOST;
  const user = process.env.MYSQL_USER || process.env.DB_USER;
  if (!host || !user) return null;

  return {
    host,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user,
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASS,
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME,
  };
}

const dbConfig = getDbConfigFromEnv();


export const mysqlPool =
  globalForMysql.mysqlPool ??
  mysql.createPool({
    ...dbConfig,
    connectionLimit: 3,
    connectTimeout: (process.env.DB_CONNECT_TIMEOUT_MS ? parseInt(process.env.DB_CONNECT_TIMEOUT_MS) : 2000)
  });

if (process.env.NODE_ENV !== "production") {
  globalForMysql.mysqlPool = mysqlPool;
}


export async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await mysqlPool.query(sql, params);
  return rows as T[];
}

export async function execute(sql: string, params: unknown[] = []) {
  const [result] = await mysqlPool.execute(sql, params);
  return result;
}