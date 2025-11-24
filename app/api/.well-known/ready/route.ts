import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

type DbConfig = {
  host: string;
  port?: number;
  user: string;
  password?: string;
  database?: string;
};

function parseDatabaseUrl(url: string): DbConfig | null {
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

function getDbConfigFromEnv(): DbConfig | null {
  // Support common env names: DATABASE_URL (mysql://...), or MYSQL_*

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

export async function GET() {
  const start = Date.now();
  const dbConfig = getDbConfigFromEnv();
  console.log("DB Config:", dbConfig);
  const result: {
    ok: boolean;
    checks: {
      db: { ok: boolean; error?: string; durationMs?: number } | { ok: null; error: string };
    };
  } = {
    ok: false,
    checks: {
      db: { ok: null, error: "no DB configuration found in environment" },
    },
  };

  if (!dbConfig) {
    const body = JSON.stringify(result);
    return new Response(body, {
      status: 503,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  let conn;
  try {
    // short connect timeout to avoid hanging readiness probe
    conn = await mysql.createConnection({ ...dbConfig, connectTimeout: 2000 });
    // ping to ensure connection is usable
    await conn.ping();
    const duration = Date.now() - start;

    result.ok = true;
    result.checks.db = { ok: true, durationMs: duration };

    await conn.end();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    const duration = Date.now() - start;
    result.ok = false;
    result.checks.db = {
      ok: false,
      error: err?.message ? String(err.message) : String(err),
      durationMs: duration,
    };
    if (conn) {
      try {
        await conn.end();
      } catch {
        /* ignore */
      }
    }
    return new Response(JSON.stringify(result), {
      status: 503,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
}