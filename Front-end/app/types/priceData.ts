export interface PriceRow {
  date: string;
  closePrice: number;
  ema11: number;
  ema13: number;
  ema22: number;
  ema32: number;
  ema34: number;
  ema50: number;
  cross11_22: "BUY" | "SELL" | null;
  cross13_32: "BUY" | "SELL" | null;
}

export interface SymbolData {
  symbol: string;
  lastAvailableDate: string;
  rows: PriceRow[];
}
