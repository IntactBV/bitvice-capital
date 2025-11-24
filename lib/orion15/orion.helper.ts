type Side = "long" | "short";

export interface PositionSizeParams {
  equity: number;        // equity total (ex: 109 USDT)
  entryPrice: number;    // prețul de intrare (ex: 86423.6)
  atr: number;           // ATR în unități de preț (SL = entry ± atr)
  riskPct: number;       // risc per tranzacție, ex: 1 => 1%
  side: Side;            // "long" sau "short"
  takerFeeRate?: number; // 0.06% = 0.0006 (Bybit default)
  leverage?: number;     // ex: 5 pentru 5x
}

export interface PositionSizeResult {
  positionSize: number;      // mărimea poziției în BTC
  notional: number;          // valoarea poziției în USDT
  marginRequired: number;    // margin necesar la leverage dat
  stopPrice: number;         // prețul stop-loss
  maxRiskUsd: number;        // risc maxim în USDT (teoretic)
  estimatedLossUsd: number;  // loss estimat la SL (cu fee)
}

export function calculateOrionPositionSize(params: PositionSizeParams): PositionSizeResult {
  const {
    equity,
    entryPrice,
    atr,
    riskPct,
    side,
    takerFeeRate = 0.0006, // 0.06% taker
    leverage = 1,
  } = params;

  if (equity <= 0) throw new Error("Equity must be > 0");
  if (entryPrice <= 0) throw new Error("Entry price must be > 0");
  if (atr <= 0) throw new Error("ATR / stop distance must be > 0");
  if (riskPct <= 0) throw new Error("Risk percent must be > 0");

  const maxRiskUsd = equity * (riskPct / 100); // ex: 109 * 0.01 = 1.09 USDT

  // SL la ATR distanță de prețul de intrare
  const stopPrice = side === "long" ? entryPrice - atr : entryPrice + atr;
  const stopDistance = Math.abs(entryPrice - stopPrice); // ar trebui să fie ≈ atr

  // Aproximare comisioane:
  // • takerFeeRate la intrare
  // • takerFeeRate la ieșire
  // aproximăm fee-urile la prețul mediu dintre entry și stop
  const avgPriceForFees = (entryPrice + stopPrice) / 2;
  const roundTripFeePerBtc = avgPriceForFees * takerFeeRate * 2; // intrare + ieșire

  // Pierdere totală per 1 BTC dacă este lovit SL (preț + fee-uri)
  const lossPerBtcUsd = stopDistance + roundTripFeePerBtc;

  // Mărimea poziției în BTC astfel încât loss total ≈ maxRiskUsd
  const positionSize = maxRiskUsd / lossPerBtcUsd;

  // Notional și margin
  const notional = positionSize * entryPrice;
  const marginRequired = notional / leverage;

  const estimatedLossUsd = lossPerBtcUsd * positionSize;

  return {
    positionSize,
    notional,
    marginRequired,
    stopPrice,
    maxRiskUsd,
    estimatedLossUsd,
  };
}
