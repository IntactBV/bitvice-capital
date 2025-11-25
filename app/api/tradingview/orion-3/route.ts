/* eslint-disable @typescript-eslint/no-explicit-any */
import { mysqlPool } from '@/lib/mysql';
import { PositionSizeParams } from '@/lib/orion15/orion.helper';
import { closePosition, ClosePositionParams, getPositions, getWalletBalances, placeOrder, PlaceOrderInput } from '@bvcRepositories/bybit.repo';
import { NextRequest, NextResponse } from 'next/server';
import { calculateOrionPositionSize } from '@/lib/orion15/orion.helper';

const ORION_LEVERAGE = 3;
const ORION_TAKER_FEE_RATE = 0.0006; // 0.06%
const ORION_RISK_PCT = 1; // 1%

let ORION_POSITION_ID: number = -1;
let ORION_ORDER_ID = null;


enum Orion3SignalAction {
  ENTRY = 'entry',
  EXIT = 'exit',
}

enum Orion3SignalSide {
  LONG = 'long',
  SHORT = 'short',
}

export async function POST(request: NextRequest) {
  try {

    const bbPostitions = await getPositions({
      category: "inverse",
      symbol: "BTCUSDT",
    });

    console.log('Current Bybit positions for BTCUSDT:', bbPostitions);

    const body = await request.json();

    console.log('Body:', body);

    const arrSymbols = body.symbol.split(".");
    const symbol = arrSymbols[0]; // ex: BTCUSDT
    const [signalAction, signalSide] = body.signal.split("_");

    if (bbPostitions.length > 0) {
      ORION_POSITION_ID = bbPostitions[0].positionIdx;

      if (signalAction === Orion3SignalAction.EXIT && ORION_POSITION_ID !== -1) {
        console.log('Close signal received, no order placement logic implemented yet.');
        const closeParams: ClosePositionParams = {
          category: "inverse",
          symbol,
          positionIdx: ORION_POSITION_ID,
        };
        console.log('Close order params:', closeParams);
        // await closePosition(closeParams);
        console.log('Position closed successfully.');
        ORION_POSITION_ID = -1;
      }

      // return NextResponse.json(
      //   { success: true, message: 'Existing position found, no new order placed', positionId: ORION_POSITION_ID },
      //   { status: 200 }
      // );
    }


    const query = "INSERT INTO tv_logs (strategy, body) VALUES(?, ?);";

    const result = await mysqlPool.execute(query, [body?.strategy ?? 'nostrategy', JSON.stringify(body)]);

    console.log('Database insert result:', result);

    const balances = await getWalletBalances("UNIFIED");
    const totalEquity = balances.reduce((sum: number, balance: any) => sum + (balance.totalEquity || 0), 0);
    const totalWalletBalance = balances.reduce((sum: number, balance: any) => sum + (balance.totalWalletBalance || 0), 0);
    const atrValue = Number(body.atr) || body.price * 0.01; // default 1% of price if ATR not provided


    if (signalAction !== Orion3SignalAction.ENTRY) {
      const params: PositionSizeParams = {
        equity: totalWalletBalance,
        entryPrice: body.price,
        atr: atrValue,
        riskPct: ORION_RISK_PCT,
        side: body.position === Orion3SignalSide.LONG ? 'long' : 'short',
        leverage: body.leverage || 1,
      };

      const positionSize = calculateOrionPositionSize(params);

      console.log('Calculated position size:', positionSize);

      const orderPayload: PlaceOrderInput = {
        category: "inverse",
        symbol,
        side: signalSide === Orion3SignalSide.LONG ? "Buy" : "Sell",
        orderType: "Limit",
        qty: positionSize.positionSize.toFixed(6),
        price: body.price, // round to 6 decimal places,
        stopLoss: positionSize.stopPrice.toFixed(2),
        // takeProfit: body.takeProfit ? String(body.takeProfit) : undefined,
        timeInForce: "GTC",
        reduceOnly: false,
        positionIdx: 0,
        // leverage: ORION_LEVERAGE,
      };
      console.log('Order payload:', orderPayload);

      // const orderResult = await placeOrder(orderPayload);
      // console.log('Order placed successfully:', orderResult);

      // ORION_ORDER_ID = orderResult.orderId;
    }

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