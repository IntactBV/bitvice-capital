/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/repositories/bybit.repo.ts
import crypto from "crypto";

const BYBIT_API_KEY = process.env.BYBIT_API_KEY!;
const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET!;
const BYBIT_BASE_URL = process.env.BYBIT_BASE_URL ?? "https://api.bybit.com";

if (!BYBIT_API_KEY || !BYBIT_API_SECRET) {
  throw new Error("Missing BYBIT_API_KEY or BYBIT_API_SECRET in env");
}

type HttpMethod = "GET" | "POST";

export interface BybitResponse<T> {
  retCode: number;
  retMsg: string;
  result: T;
  time: number;
}

type QueryParams = Record<string, string | number | boolean | undefined>;

interface RequestOptions<TBody = any> {
  path: string;
  method?: HttpMethod;
  query?: QueryParams;
  body?: TBody | null;
  recvWindow?: number;
}

function buildQueryString(params?: QueryParams): string {
  if (!params) return "";
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => [k, String(v)] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b));

  return new URLSearchParams(entries).toString();
}

function sign(message: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

/**
 * Low-level generic request v5
 */
async function bybitRequest<TRes = any, TBody = any>(
  opts: RequestOptions<TBody>
): Promise<BybitResponse<TRes>> {
  const { path, method = "GET", query, body = null, recvWindow = 5000 } = opts;

  const timestamp = Date.now().toString();
  const queryString = buildQueryString(query);

  let bodyString = "";
  let signPayload = "";

  if (method === "GET") {
    // rule: timestamp + api_key + recv_window + queryString
    signPayload = timestamp + BYBIT_API_KEY + recvWindow + queryString;
  } else {
    // POST: timestamp + api_key + recv_window + jsonBodyString
    bodyString = body ? JSON.stringify(body) : "";
    signPayload = timestamp + BYBIT_API_KEY + recvWindow + bodyString;
  }

  const signature = sign(signPayload, BYBIT_API_SECRET);

  let url = `${BYBIT_BASE_URL}${path}`;
  if (queryString) {
    url += `?${queryString}`;
  }

  const res = await fetch(url, {
    method,
    headers: {
      "X-BAPI-API-KEY": BYBIT_API_KEY,
      "X-BAPI-SIGN": signature,
      "X-BAPI-TIMESTAMP": timestamp,
      "X-BAPI-RECV-WINDOW": recvWindow.toString(),
      "Content-Type": "application/json",
    },
    body: method === "POST" ? (bodyString || undefined) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bybit HTTP error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as BybitResponse<TRes>;

  if (json.retCode !== 0) {
    throw new Error(`Bybit API error ${json.retCode}: ${json.retMsg}`);
  }

  return json;
}

/* ================== Tipuri utile ================== */

export type WalletBalance = {
  accountType: string;
  totalEquity: string;
  coin: Array<{
    coin: string;
    equity: string;
    availableToWithdraw: string;
    walletBalance?: string;
  }>;
};

export type PlaceOrderInput = {
  category: "linear" | "inverse" | "spot";
  symbol: string;
  side: "Buy" | "Sell";
  orderType: "Market" | "Limit";
  qty: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK" | "PostOnly";
  reduceOnly?: boolean;
  positionIdx?: number;
  stopLoss?: string;
  takeProfit?: string;
  leverage?: number;
};

export type PlaceOrderResult = {
  orderId: string;
  orderLinkId?: string;
};

/* ================== Metode repository ================== */

/**
 * GET /v5/account/wallet-balance
 */
export async function getWalletBalances(
  accountType: "UNIFIED" | "CONTRACT" | "SPOT" = "UNIFIED",
  coin?: string
) {
  const res = await bybitRequest<{ list: WalletBalance[] }>({
    path: "/v5/account/wallet-balance",
    method: "GET",
    query: {
      accountType,
      ...(coin ? { coin } : {}),
    },
  });

  return res.result.list;
}

/**
 * POST /v5/order/create
 */
// replace $SELECTION_PLACEHOLDER$ with this

export async function setLeverage(params: {
  category: "linear" | "inverse" | "option";
  symbol: string;
  // Bybit v5 accepts buyLeverage/sellLeverage (some markets) — set both for simplicity
  buyLeverage?: number;
  sellLeverage?: number;
  // optional position index for isolated multi-position (0/1)
  positionIdx?: number;
}) {
  const body = { ...params };
  const res = await bybitRequest<any, typeof body>({
    path: "/v5/position/set-leverage",
    method: "POST",
    body,
  });

  return res.result;
}

export async function placeOrder(
  input: PlaceOrderInput
) {
  // If leverage was provided and this is a contract category (not spot),
  // apply it before placing the order.
  if (input.leverage && input.category !== "spot") {
    await setLeverage({
      category: input.category as "linear" | "inverse" | "option",
      symbol: input.symbol,
      buyLeverage: Number(input.leverage),
      sellLeverage: Number(input.leverage),
      positionIdx: input.positionIdx,
    });
  }

  // Bybit v5 /v5/order/create accepts optional stopLoss / takeProfit in the JSON body.
  const { leverage, ...rest } = input;
  const body = {
    ...rest,
  };

  const res = await bybitRequest<PlaceOrderResult, typeof body>({
    path: "/v5/order/create",
    method: "POST",
    body,
  });

  return res.result;
}

/**
 * GET /v5/order/realtime
 */
export async function getOpenOrders(params: {
  category: "linear" | "inverse" | "spot" | "option";
  symbol?: string;
  baseCoin?: string;
  settleCoin?: string;
}) {
  const res = await bybitRequest<{ list: any[] }>({
    path: "/v5/order/realtime",
    method: "GET",
    query: params,
  });

  return res.result.list;
}

/**
 * GET /v5/position/list
 */
export async function getPositions(params: {
  category: "linear" | "inverse" | "option";
  symbol?: string;
  settleCoin?: string;
}) {
  const res = await bybitRequest<{ list: any[] }>({
    path: "/v5/position/list",
    method: "GET",
    query: params,
  });

  return res.result.list;
}

/**
 * GET /v5/market/kline
 */
export async function getKlines(params: {
  category: "linear" | "inverse" | "spot";
  symbol: string;
  interval: string;
  start?: number;
  end?: number;
  limit?: number;
}) {
  const res = await bybitRequest<{ list: any[] }>({
    path: "/v5/market/kline",
    method: "GET",
    query: params,
  });

  return res.result.list;
}
