"use client";

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

interface Props {
  rows: any[];
  symbol: string;
}

export default function ChartsSection({ rows, symbol }: Props) {
  const labels = rows.map((r) => r.date);

  const ema11 = rows.map((r) => r.ema11);
  const ema13 = rows.map((r) => r.ema13);
  const ema22 = rows.map((r) => r.ema22);
  const ema34 = rows.map((r) => r.ema34);
  const ema50 = rows.map((r) => r.ema50);

  // BUY / SELL points based on crossover flags
  const buyPoints = rows.map((r) =>
    r.cross11_22 === "BUY" || r.cross13_32 === "BUY"
      ? r.ema11
      : null
  );

  const sellPoints = rows.map((r) =>
    r.cross11_22 === "SELL" || r.cross13_32 === "SELL"
      ? r.ema11
      : null
  );

  const data = {
    labels,
    datasets: [
      {
        label: "EMA 11",
        data: ema11,
        borderColor: "#2563eb",
        borderWidth: 2,
        tension: 0.3
      },
      {
        label: "EMA 13",
        data: ema13,
        borderColor: "#7c3aed",
        borderWidth: 2,
        tension: 0.3
      },
      {
        label: "EMA 22",
        data: ema22,
        borderColor: "#16a34a",
        borderWidth: 2,
        tension: 0.3
      },
      {
        label: "EMA 34",
        data: ema34,
        borderColor: "#ea580c",
        borderWidth: 2,
        tension: 0.3
      },
      {
        label: "EMA 50",
        data: ema50,
        borderColor: "#6b7280",
        borderWidth: 2,
        tension: 0.3
      },

      // BUY markers
      {
        label: "BUY",
        data: buyPoints,
        showLine: false,
        pointRadius: 7,
        pointBackgroundColor: "green",
        pointBorderColor: "green"
      },

      // SELL markers
      {
        label: "SELL",
        data: sellPoints,
        showLine: false,
        pointRadius: 7,
        pointBackgroundColor: "red",
        pointBorderColor: "red"
      }
    ]
  };

  const options = {
    responsive: true,
    interaction: {
      mode: "nearest" as const,
      intersect: true
    },
    plugins: {
      legend: {
        position: "top" as const
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            if (ctx.dataset.label === "BUY") return "BUY Signal";
            if (ctx.dataset.label === "SELL") return "SELL Signal";
            return `${ctx.dataset.label}: ${ctx.raw}`;
          }
        }
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: "Price"
        }
      },
      x: {
        title: {
          display: true,
          text: "Date"
        }
      }
    }
  };

  return (
    <div className="chart-wrapper">
      <h3>{symbol} — EMA Crossover Chart</h3>
      <Line data={data} options={options} />
    </div>
  );
}
