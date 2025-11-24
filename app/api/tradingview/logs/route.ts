import { mysqlPool } from '@/lib/mysql';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Adjust query as needed (add WHERE, ORDER BY, LIMIT, etc.)
    const [rows] = await mysqlPool.query('SELECT * FROM tv_logs');
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
}
