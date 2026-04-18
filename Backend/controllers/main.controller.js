const model = require("../models/model");
require("dotenv").config();
const { Op } = require("sequelize");
const utilService = require("../services/utilService");
const averageService = require("../services/average.service");
const parseExcel = require("../services/excel.service");
const path = require("path");
const XLSX = require("xlsx");

const uploadCompanies = async (req, res) => {
  const transaction = await model.sequelize.transaction();

  try {
    const filePath = path.join(
      __dirname,
      "../uploads/initial-company/initial-company.xlsx",
    );

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return res.status(400).json({ error: "Excel file is empty" });
    }

    /* -----------------------------------------
           1️⃣ CLEAN DATA (DELETE, NOT TRUNCATE)
        ------------------------------------------ */

    await model.PriceData.destroy({ where: {}, transaction });
    await model.Company.destroy({ where: {}, transaction });

    /* -----------------------------------------
           2️⃣ PREPARE DATA
        ------------------------------------------ */

    const companies = rows.map((row) => ({
      symbol: row["Symbol"],
      companyName: row["Company Name"],
      marketCap: row["Market Cap"],
      index1: row["Index-1"],
      index2: row["Index-2"],
      index3: row["Index-3"],
    }));

    /* -----------------------------------------
           3️⃣ BULK INSERT
        ------------------------------------------ */

    await model.Company.bulkCreate(companies, {
      validate: true,
      transaction,
    });

    await transaction.commit();

    res.json({
      message: "Company data reset and reloaded successfully",
      totalInserted: companies.length,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("error....", error);

    res.status(500).json({
      error: "Failed to upload companies",
    });
  }
};

/**
 * Excel format:
 * | Company Name | Symbol | 1-1-25 | 2-1-25 | 3-1-25 | ...
 */
const bulkUploadPriceData = async (req, res) => {
  const transaction = await model.sequelize.transaction();

  try {
    const filePath = path.join(
      __dirname,
      "../uploads/price-data/price-data.xlsx",
    );

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // 2️⃣ Convert sheet to JSON
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (!rows.length) {
      return res.status(400).json({ message: "Excel is empty" });
    }

    const companies = await model.Company.findAll();

    const companyMap = {};
    companies.forEach((c) => {
      companyMap[c.symbol] = c.id;
    });

    const bulkPrices = [];

    for (const row of rows) {
      const companyId = companyMap[row.Symbol];
      if (!companyId) continue;

      Object.keys(row).forEach((key) => {
        // Skip non-date columns
        if (key === "Company Name" || key === "Symbol") return;

        const price = Number(row[key]);
        if (!price || isNaN(price)) return;

        const priceDate = utilService.normalizeExcelDate(key);

        // 🔒 HARD STOP — invalid dates NEVER reach Sequelize
        if (!priceDate) {
          console.warn("Skipping invalid date column:", key);
          return;
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(priceDate)) {
          console.warn("Malformed DATEONLY:", priceDate);
          return;
        }

        bulkPrices.push({
          companyId,
          priceDate: priceDate,
          closePrice: price,
        });
      });
    }

    await model.PriceData.bulkCreate(bulkPrices, {
      transaction,
      ignoreDuplicates: true,
    });

    await transaction.commit();
    res.json({ message: "Price data uploaded successfully" });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ error: err.message });
  }
};

const calculateAveragesForAllCompanies = async (req, res) => {
  try {
    const companies = await model.Company.findAll({
      attributes: ["id", "symbol"],
    });

    let totalSignals = 0;

    for (const company of companies) {
      const prices = await model.PriceData.findAll({
        where: { companyId: company.id },
        order: [["priceDate", "ASC"]],
        raw: true,
      });

      if (prices.length < 50) continue; // not enough data

      const signals = averageService.calculateSignals(prices);

      if (!signals.length) continue;

      const payload = signals.map((s) => ({
        ...s,
        companyId: company.id,
      }));

      await model.MovingAverage.bulkCreate(payload);

      totalSignals += payload.length;
    }

    res.json({
      message: "Moving averages calculated for all companies",
      totalCompanies: companies.length,
      totalRecordsInserted: totalSignals,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// const getAllMovingAveragesTable = async (req, res) => {
//     try {
//         const { range = "3m" } = req.query;
//         const companies = await model.Company.findAll({ attributes: ["id", "symbol"], raw: true });
//         const response = [];

//         for (const company of companies) {
//             // 1️⃣ Get last available price date
//             const lastPrice = await model.PriceData.findOne({
//                 where: { companyId: company.id },
//                 order: [["priceDate", "DESC"]],
//                 attributes: ["priceDate"],
//                 raw: true,
//             });

//             if (!lastPrice) continue;

//             const { start, end, visibleDays } = utilService.resolveRangeWithFallback(lastPrice.priceDate, range);

//             // 2️⃣ Fetch price data
//             const prices = await model.PriceData.findAll({
//                 where: {
//                     companyId: company.id,
//                     priceDate: { [Op.between]: [start, end] },
//                 },
//                 order: [["priceDate", "ASC"]],
//                 raw: true,
//             });

//             if (!prices.length) continue;

//             // 3️⃣ Calculate moving averages
//             const calculated = utilService.calculateDailyMovingAverages(prices);

//             // 4️⃣ Slice last 'visibleDays' or all available if less
//             // const visibleRows = calculated.slice(-visibleDays);
//             const visibleRows = calculated.slice(-visibleDays).reverse();

//             response.push({
//                 symbol: company.symbol,
//                 lastAvailableDate: lastPrice.priceDate,
//                 rows: visibleRows,
//             });
//         }

//         res.json({
//             range,
//             totalSymbols: response.length,
//             data: response,
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: err.message });
//     }
// };

// const getAllMovingAveragesTable = async (req, res) => {
//   try {
//     const { range = "3m", index } = req.query;

//     const companies = await model.Company.findAll({
//       where: index
//         ? {
//             [Op.or]: [{ index1: index }, { index2: index }, { index3: index }],
//           }
//         : {},
//       attributes: ["id", "symbol", "marketCap", "index1", "index2", "index3"],
//       raw: true,
//     });

//     const response = [];

//     for (const company of companies) {
//       const lastPrice = await model.PriceData.findOne({
//         where: { companyId: company.id },
//         order: [["priceDate", "DESC"]],
//         attributes: ["priceDate"],
//         raw: true,
//       });

//       if (!lastPrice) continue;

//       const { start, end, visibleDays } = utilService.resolveRangeWithFallback(
//         lastPrice.priceDate,
//         range,
//       );

//       const prices = await model.PriceData.findAll({
//         where: {
//           companyId: company.id,
//           priceDate: { [Op.between]: [start, end] },
//         },
//         order: [["priceDate", "ASC"]],
//         raw: true,
//       });

//       if (!prices.length) continue;

//       const calculated = utilService.calculateDailyMovingAverages(prices);

//       const visibleRows = calculated.slice(-visibleDays).reverse(); // latest first

//       response.push({
//         symbol: company.symbol,
//         marketCap: company.marketCap,
//         index1: company.index1,
//         index2: company.index2,
//         index3: company.index3,
//         lastAvailableDate: lastPrice.priceDate,
//         rows: visibleRows,
//       });
//     }

//     response.sort(
//       (a, b) => new Date(b.lastAvailableDate) - new Date(a.lastAvailableDate),
//     );

//     res.json({
//       range,
//       index: index || "ALL",
//       totalSymbols: response.length,
//       data: response,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };

const getAllMovingAveragesTable = async (req, res) => {
  try {
    const {
      range = "7d",
      index1,
      index2,
      index3,
      startDate,
      endDate,
    } = req.query;

    const conditions = [];

    // REMOVE this:
    const buildOr = (val) => ({
      [Op.or]: [{ index1: val }, { index2: val }, { index3: val }],
    });

    if (index1) conditions.push(buildOr(index1));
    if (index2) conditions.push(buildOr(index2));
    if (index3) conditions.push(buildOr(index3));

    // REPLACE with this:
    if (index1) conditions.push({ index1: index1 });
    if (index2) conditions.push({ index2: index2 });
    if (index3) conditions.push({ index3: index3 });

    if (index1) conditions.push(buildOr(index1));
    if (index2) conditions.push(buildOr(index2));
    if (index3) conditions.push(buildOr(index3));

    const whereCondition =
      conditions.length > 0 ? { [Op.and]: conditions } : {};

    const companies = await model.Company.findAll({
      where: whereCondition,
      attributes: ["id", "symbol", "marketCap", "index1", "index2", "index3"],
      raw: true,
    });

    if (!companies.length) {
      return res.json({
        range,
        filterApplied: index1
          ? `index1=${index1}`
          : index2
            ? `index2=${index2}`
            : index3
              ? `index3=${index3}`
              : "ALL",
        totalSymbols: 0,
        data: [],
      });
    }

    const companyIds = companies.map((c) => c.id);

    // 1. Fetch max priceDate per company directly from DB engine
    const lastDatesResult = await model.PriceData.findAll({
      attributes: [
        "companyId",
        [
          model.sequelize.fn("MAX", model.sequelize.col("priceDate")),
          "lastAvailableDate",
        ],
      ],
      where: { companyId: { [Op.in]: companyIds } },
      group: ["companyId"],
      raw: true,
    });

    const lastDatesMap = {};
    lastDatesResult.forEach((r) => {
      lastDatesMap[r.companyId] = r.lastAvailableDate;
    });

    // 2. Identify global min 'start' date based on required dynamic fallbacks
    let globalStart = null;
    const companyRanges = {};

    if (startDate && endDate) {
      // Manual calendar mode
      const sDate = new Date(startDate);
      const fetchDate = new Date(sDate);
      fetchDate.setDate(sDate.getDate() - 60);
      globalStart = fetchDate.toISOString().slice(0, 10);

      companies.forEach((company) => {
        companyRanges[company.id] = {
          start: globalStart,
          end: endDate,
          visibleStart: startDate,
          visibleEnd: endDate,
          lastDate: lastDatesMap[company.id],
        };
      });
    } else {
      // String fallback mode
      companies.forEach((company) => {
        const lastDate = lastDatesMap[company.id];
        if (lastDate) {
          const { start, end, visibleDays } =
            utilService.resolveRangeWithFallback(lastDate, range);
          companyRanges[company.id] = { start, end, visibleDays, lastDate };

          if (!globalStart || new Date(start) < new Date(globalStart)) {
            globalStart = start;
          }
        }
      });
    }

    if (!globalStart) {
      return res.json({
        range,
        filterApplied: index1
          ? `index1=${index1}`
          : index2
            ? `index2=${index2}`
            : index3
              ? `index3=${index3}`
              : "ALL",
        totalSymbols: 0,
        data: [],
      });
    }

    // 3. Batched Memory Aggregation Network Query
    const priceWhere = { companyId: { [Op.in]: companyIds } };
    if (startDate && endDate) {
      priceWhere.priceDate = { [Op.between]: [globalStart, endDate] };
    } else {
      priceWhere.priceDate = { [Op.gte]: globalStart };
    }

    const allPrices = await model.PriceData.findAll({
      where: priceWhere,
      order: [["priceDate", "ASC"]],
      raw: true,
    });

    const pricesByCompany = {};
    allPrices.forEach((p) => {
      if (!pricesByCompany[p.companyId]) pricesByCompany[p.companyId] = [];
      pricesByCompany[p.companyId].push(p);
    });

    const response = [];

    // 4. Memory thread processing decoupled from network DB
    for (const company of companies) {
      const rangeInfo = companyRanges[company.id];
      if (!rangeInfo) continue;

      const companyPrices = pricesByCompany[company.id] || [];
      const validPrices = companyPrices.filter(
        (p) => p.priceDate >= rangeInfo.start && p.priceDate <= rangeInfo.end,
      );

      if (!validPrices.length) continue;

      const calculated = utilService.calculateDailyMovingAverages(validPrices);

      let visibleRows;
      if (startDate && endDate) {
        visibleRows = calculated
          .filter(
            (r) =>
              r.date >= rangeInfo.visibleStart &&
              r.date <= rangeInfo.visibleEnd,
          )
          .reverse();
      } else {
        visibleRows = calculated.slice(-rangeInfo.visibleDays).reverse();
      }

      response.push({
        symbol: company.symbol,
        marketCap: company.marketCap,
        index1: company.index1,
        index2: company.index2,
        index3: company.index3,
        lastAvailableDate: rangeInfo.lastDate,
        rows: visibleRows,
      });
    }

    response.sort(
      (a, b) => new Date(b.lastAvailableDate) - new Date(a.lastAvailableDate),
    );

    res.json({
      range: startDate && endDate ? `${startDate} to ${endDate}` : range,
      filterApplied: index1
        ? `index1=${index1}`
        : index2
          ? `index2=${index2}`
          : index3
            ? `index3=${index3}`
            : "ALL",
      totalSymbols: response.length,
      data: response,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const getCompanyCount = async (req, res) => {
  try {
    const totalCompanies = await model.Company.count();

    res.json({
      data: {
        totalCompanies: totalCompanies,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const getIndexFilters = async (req, res) => {
  try {
    const companies = await model.Company.findAll({
      attributes: ["index1", "index2", "index3"],
      raw: true,
    });

    const result = {
      index1: new Set(),
      index2: new Set(),
      index3: new Set(),
    };

    companies.forEach((c) => {
      if (c.index1) result.index1.add(c.index1);
      if (c.index2) result.index2.add(c.index2);
      if (c.index3) result.index3.add(c.index3);
    });

    res.json({
      index1: Array.from(result.index1).sort(),
      index2: Array.from(result.index2).sort(),
      index3: Array.from(result.index3).sort(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  uploadCompanies,
  bulkUploadPriceData,
  calculateAveragesForAllCompanies,
  getAllMovingAveragesTable,
  getCompanyCount,
  getIndexFilters,
};
