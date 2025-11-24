import { mysqlPool } from '@/lib/mysql';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // const rawBody = await request.text();
    // console.log('Raw body from TradingView:', rawBody);

    const body = await request.json();

    console.log('Body:', body);

    const query = "INSERT INTO tv_logs (strategy, body) VALUES(?, ?);";

    const result = await mysqlPool.execute(query, [body?.strategy ?? 'nostrategy', JSON.stringify(body)]);

    console.log('Database insert result:', result);

    return NextResponse.json(
      { success: true, message: 'Data saved' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save data' },
      { status: 500 }
    );
  }
}