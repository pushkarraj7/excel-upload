"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URLS } from "@/app/services/apiService/apiUrls";
import PriceChart from "@/app/components/Charts/ChartsSection";
import "./chartsection.scss";
import apiMethods from "@/app/services/apiService/apiMethods";

export default function ChartsPage() {
  const [symbolsData, setSymbolsData] = useState<any[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const average = async () => {
    try {
      const res = await apiMethods.get(API_URLS.CALCULATE_AVERAGE);

      // ✅ auto-select first symbol
      if (res?.data?.length > 0) {
        setSymbolsData(res?.data);
        setSelectedSymbol(res.data[0].symbol);
      }
    } catch (error) {
      console.log('error..', error);
    }

  };

  useEffect(() => {
    average();
  }, []);

  const selectedSymbolData = useMemo(() => {
    if (!selectedSymbol) return null;
    return symbolsData.find((s) => s.symbol === selectedSymbol);
  }, [symbolsData, selectedSymbol]);

  return (
    <div className="charts-page">
      <h2>Charts</h2>

      {/* Symbol Selector */}
      <div className="symbol-select">
        <label>Select Symbol: </label>
        <select
          value={selectedSymbol || ""}
          onChange={(e) => setSelectedSymbol(e.target.value)}
        >
          {symbolsData.map((s) => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol}
            </option>
          ))}
        </select>
      </div>

      {/* Chart */}
      {selectedSymbolData && (
        <PriceChart
          symbol={selectedSymbolData.symbol}
          rows={selectedSymbolData.rows}
        />
      )}
    </div>
  );
}
