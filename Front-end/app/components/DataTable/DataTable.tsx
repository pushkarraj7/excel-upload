import './datatable.scss'


interface Props {
  symbol: string;
  rows: any[];
  marketCap: string;
  index1: string;
  index2: string;
  index3: string;
}

export default function PriceDataTable({ symbol, marketCap, rows, index1, index2, index3 }: Props) {
  if (!rows || rows.length === 0) return null;

  const dates = rows.map((r) => r.date);

  const metrics = [
    { label: "Close Price", key: "closePrice" },
    { label: "EMA 11", key: "ema11" },
    { label: "EMA 13", key: "ema13" },
    { label: "EMA 22", key: "ema22" },
    { label: "EMA 34", key: "ema34" },
    { label: "EMA 50", key: "ema50" },
    { label: "11 / 22", key: "cross11_22", signal: true },
    { label: "13 / 34", key: "cross13_34", signal: true },
  ];

  return (
    <div className="price-table-wrapper">
      <table className="price-table">
        <thead>
          <tr>
            <th className="sticky-col">Symbol</th>
            <th className="sticky-col">Market Cap</th>
            <th className="sticky-col">Index-1</th>
            <th className="sticky-col">Index-2</th>
            <th className="sticky-col">Index-3</th>
            <th className="sticky-col-2">Metric</th>
            {dates.map((d) => (
              <th key={d}>{d}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {metrics.map((metric, idx) => (
            <tr key={metric.key}>
              {idx === 0 && (
                <>
                  <td
                    className="sticky-col symbol"
                    rowSpan={metrics.length}
                  >
                    {symbol}
                  </td>


                  <td className="sticky-col market-cap" rowSpan={metrics.length}>
                    {marketCap || "-"}
                  </td>

                  <td className="sticky-col market-cap" rowSpan={metrics.length}>
                    {index1 || "-"}
                  </td>
                  <td className="sticky-col market-cap" rowSpan={metrics.length}>
                    {index2 || "-"}
                  </td>
                  <td className="sticky-col market-cap" rowSpan={metrics.length}>
                    {index3 || "-"}
                  </td>
                </>
              )}

              <td className="sticky-col-2 metric">
                {metric.label}
              </td>

              {rows.map((row, i) => {
                const val = row[metric.key];
                let color = "inherit";
                if (val === "BUY") color = "green";
                else if (val === "SELL") color = "red";

                return (
                  <td key={i} style={{ color, fontWeight: val === "BUY" || val === "SELL" ? "bold" : "normal" }}>
                    {val ?? "-"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
