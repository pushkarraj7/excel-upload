const crypto = require("crypto");
const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = process.env.SECRET_KEY || "your-32-char-secret-key";
const moment = require("moment");
const model = require("../models/model");
const XLSX = require("xlsx");
const bcrypt = require("bcryptjs");
const sequelize = require("../config/db");
const path = require("path");
const { parentPort, Worker } = require("worker_threads");

function encryptPassword(text) {
    const iv = crypto.randomBytes(16); // always 16 bytes
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(SECRET_KEY, "utf8"), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted; // store IV + encrypted text
}

function decryptPassword(encryptedText) {
    const [ivHex, data] = encryptedText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encryptedBuffer = Buffer.from(data, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(SECRET_KEY, "utf8"), iv);
    let decrypted = decipher.update(encryptedBuffer, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

function formatTime(dateTime) {
    if (!dateTime) return null;

    // Parse without timezone shift
    const d = new Date(dateTime);

    // Use the UTC hours/minutes directly to prevent 5-hour shift
    const hours = d.getUTCHours();
    const minutes = d.getUTCMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, "0");

    return `${formattedHours.toString().padStart(2, "0")}:${formattedMinutes} ${ampm}`;
}

function excelSerialToJSDate(serial, date1904 = false) {
    // handle null/empty
    if (serial === null || serial === undefined || serial === "") return null;

    // If it's already a JS Date, return it
    if (serial instanceof Date) {
        return isNaN(serial.getTime()) ? null : serial;
    }

    // Numbers are Excel serials -> convert
    if (typeof serial === "number") {
        // Excel's epoch offset to Unix epoch (days)
        const epochOffset = date1904 ? 24107 : 25569; // adjust if 1904 date system
        const milliseconds = (serial - epochOffset) * 86400 * 1000;
        const d = new Date(Math.round(milliseconds));
        return isNaN(d.getTime()) ? null : d;
    }

    // Strings: try normal parsing first
    const parsed = new Date(serial);
    if (!isNaN(parsed.getTime())) return parsed;

    // fallback for common "MM/DD/YYYY" or "DD/MM/YYYY" formats
    const m = serial.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) {
        const p1 = parseInt(m[1], 10);
        const p2 = parseInt(m[2], 10);
        const y = parseInt(m[3], 10);

        // Try MM/DD/YYYY first (US)
        let d = new Date(y, p1 - 1, p2);
        if (!isNaN(d.getTime())) return d;

        // Then try DD/MM/YYYY
        d = new Date(y, p2 - 1, p1);
        if (!isNaN(d.getTime())) return d;
    }

    // couldn't parse
    return null;
}

const normalizeExcelDate = (value) => {
    if (typeof value === "number") {
        const epoch = new Date(Date.UTC(1899, 11, 30));
        const date = new Date(epoch.getTime() + value * 86400000);
        return date.toISOString().slice(0, 10);
    }

    if (typeof value !== "string") return null;

    const clean = value.trim();

    // MM/DD/YY
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(clean)) {
        const [m, d, y] = clean.split("/");
        return `20${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    // DD-MM-YYYY
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(clean)) {
        const [d, m, y] = clean.split("-");
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    // DD-MM-YY
    if (/^\d{1,2}-\d{1,2}-\d{2}$/.test(clean)) {
        const [d, m, y] = clean.split("-");
        return `20${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    // ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
        return clean;
    }

    return null; // ❗ DO NOT THROW
};

function resolveRange(range = "30d") {
    const map = { "30d": 30, "3m": 90, "6m": 180, "1y": 365 };
    const visibleDays = map[range] || 30;

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (visibleDays + 60)); // extra buffer for MA

    // Convert to YYYY-MM-DD for DB
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    return { start: startStr, end: endStr, visibleDays };
}


function calculateSMAAtIndex(data, index, window) {
    if (index + 1 < window) return null;

    let sum = 0;
    for (let i = index - window + 1; i <= index; i++) {
        sum += Number(data[i].closePrice);
    }
    const value = sum / window;
    const toFixed = value.toFixed(2)
    return toFixed;
}

function calculateEMA(data, window) {
  const k = 2 / (window + 1);
  const ema = [];

  for (let i = 0; i < data.length; i++) {
    const price = Number(data[i].closePrice);

    if (i === window - 1) {
      // First EMA = SMA of first window
      const sma =
        data
          .slice(0, window)
          .reduce((sum, d) => sum + Number(d.closePrice), 0) / window;

      ema.push({
        index: i,
        value: Number(sma.toFixed(2)),
        priceDate: data[i].priceDate,
      });
    } else if (i >= window) {
      const prevEMA = ema[ema.length - 1].value;
      const value = price * k + prevEMA * (1 - k);

      ema.push({
        index: i,
        value: Number(value.toFixed(2)),
        priceDate: data[i].priceDate,
      });
    }
  }

  return ema;
}


function calculateDailyMovingAverages(prices) {
  const ema11 = calculateEMA(prices, 11);
  const ema22 = calculateEMA(prices, 22);
  const ema13 = calculateEMA(prices, 13);
  const ema34 = calculateEMA(prices, 34);
  const ema50 = calculateEMA(prices, 50);

  const rows = [];

  for (let i = 0; i < prices.length; i++) {
    const e11 = ema11.find(e => e.index === i)?.value ?? null;
    const e22 = ema22.find(e => e.index === i)?.value ?? null;
    const e13 = ema13.find(e => e.index === i)?.value ?? null;
    const e34 = ema34.find(e => e.index === i)?.value ?? null;
    const e50 = ema50.find(e => e.index === i)?.value ?? null;

    rows.push({
      date: prices[i].priceDate,
      closePrice: Number(prices[i].closePrice),

      ema11: e11,
      ema22: e22,
      cross11_22:
        e11 !== null && e22 !== null
          ? e11 > e22 ? "BUY" : "SELL"
          : null,

      ema13: e13,
    ema34: e34,
      cross13_34:
        e13 !== null && e34 !== null
          ? e13 > e34 ? "BUY" : "SELL"
          : null,

      ema50: e50,
    });
  }

  return rows;
}

function resolveRangeWithFallback(lastAvailableDate, range = "1d") {
    const map = { "1d": 1, "7d": 7, "30d": 30, "3m": 90, "6m": 180, "1y": 365 };
    const visibleDays = map[range] || 1;

    if (!lastAvailableDate) return { start: null, end: null, visibleDays };

    const end = new Date(lastAvailableDate);
    const start = new Date(end);
    start.setDate(end.getDate() - (visibleDays + 60)); // buffer for MA

    return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        visibleDays,
    };
}


module.exports = { encryptPassword, decryptPassword, formatTime, normalizeExcelDate, resolveRange, calculateDailyMovingAverages, resolveRangeWithFallback };
