const model = require("../models/model");
require("dotenv").config();
const { Op } = require("sequelize");
const utilService = require("../services/utilService");
const averageService = require("../services/average.service");
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
 * Excel format (user-uploaded):
 * | Company Name | Symbol | 1-1-25 | 2-1-25 | ...
 *
 * FIX: If a symbol from the price Excel is not in the companies table,
 * we auto-insert it so no rows are silently skipped.
 */
const bulkUploadPriceData = async (req, res) => {
  try {
    const filePath = path.join(
      __dirname,
      "../uploads/price-data/price-data.xlsx",
    );

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // ✅ raw: false keeps date columns as strings e.g. "1-1-25" not 45658
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });

    if (!rows.length) {
      return res.status(400).json({ message: "Excel is empty" });
    }

    /* -----------------------------------------
       1️⃣ BUILD SYMBOL → COMPANY NAME MAP FROM EXCEL
    ------------------------------------------ */
    const excelSymbolMap = {};
    for (const row of rows) {
      const symbol = row["Symbol"];
      const companyName = row["Company Name"];
      if (symbol) {
        excelSymbolMap[symbol.trim()] = companyName
          ? companyName.trim()
          : symbol.trim();
      }
    }

    const excelSymbols = Object.keys(excelSymbolMap);
    if (!excelSymbols.length) {
      return res.status(400).json({
        message: 'No "Symbol" column found in Excel. Check your file format.',
      });
    }

    /* -----------------------------------------
       2️⃣ FIND WHICH SYMBOLS ARE MISSING IN DB
       ✅ No transaction here — read-only query
    ------------------------------------------ */
    const existingCompanies = await model.Company.findAll({
      where: { symbol: { [Op.in]: excelSymbols } },
    });

    const existingSymbols = new Set(existingCompanies.map((c) => c.symbol));
    const missingSymbols = excelSymbols.filter((s) => !existingSymbols.has(s));

    /* -----------------------------------------
       3️⃣ AUTO-INSERT MISSING COMPANIES
       ✅ Separate from main transaction — prevents connection timeout
          on large datasets (2800+ companies)
    ------------------------------------------ */
    if (missingSymbols.length) {
      console.log(`Auto-inserting ${missingSymbols.length} missing companies`);

      const newCompanies = missingSymbols.map((symbol) => ({
        symbol,
        companyName: excelSymbolMap[symbol],
        marketCap: null,
        index1: null,
        index2: null,
        index3: null,
      }));

      // ✅ No transaction — committed immediately, connection stays alive
      await model.Company.bulkCreate(newCompanies, {
        ignoreDuplicates: true,
      });
    }

    /* -----------------------------------------
       4️⃣ RELOAD FULL COMPANY MAP (now includes new ones)
       ✅ No transaction — read-only query
    ------------------------------------------ */
    const allCompanies = await model.Company.findAll({
      where: { symbol: { [Op.in]: excelSymbols } },
    });

    const companyMap = {};
    allCompanies.forEach((c) => {
      companyMap[c.symbol] = c.id;
    });

    /* -----------------------------------------
       5️⃣ BUILD PRICE ROWS
    ------------------------------------------ */
    const bulkPrices = [];
    let skippedInvalidDate = 0;
    let skippedNoPrice = 0;
    let skippedNoCompany = 0;

    for (const row of rows) {
      const symbol = row["Symbol"] ? row["Symbol"].trim() : null;
      const companyId = symbol ? companyMap[symbol] : null;

      if (!companyId) {
        skippedNoCompany++;
        continue;
      }

      for (const key of Object.keys(row)) {
        if (key === "Company Name" || key === "Symbol") continue;

        const price = Number(row[key]);
        if (!price || isNaN(price)) {
          skippedNoPrice++;
          continue;
        }

        const priceDate = utilService.normalizeExcelDate(key);

        if (!priceDate) {
          skippedInvalidDate++;
          console.warn("Skipping invalid date column:", key);
          continue;
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(priceDate)) {
          skippedInvalidDate++;
          console.warn("Malformed DATEONLY:", priceDate);
          continue;
        }

        bulkPrices.push({
          companyId,
          priceDate,
          closePrice: price,
        });
      }
    }

    if (!bulkPrices.length) {
      return res.status(400).json({
        message:
          "No valid price rows found. Check date column format (expected: D-M-YY or D-M-YYYY).",
        debug: { skippedInvalidDate, skippedNoPrice, skippedNoCompany },
      });
    }

    /* -----------------------------------------
       6️⃣ BULK INSERT PRICES — own transaction
    ------------------------------------------ */
    // ✅ NEW — insert in chunks of 1000, no transaction
    const CHUNK_SIZE = 1000;
    let totalInserted = 0;

    for (let i = 0; i < bulkPrices.length; i += CHUNK_SIZE) {
      const chunk = bulkPrices.slice(i, i + CHUNK_SIZE);
      // await model.PriceData.bulkCreate(chunk, {
      //   ignoreDuplicates: true,
      // });
      await model.PriceData.bulkCreate(chunk, {
        updateOnDuplicate: ["closePrice", "updatedAt"],
      });
      totalInserted += chunk.length;
      console.log(
        `Inserted ${totalInserted}/${bulkPrices.length} price rows...`,
      );
    }

    res.json({
      message: "Price data uploaded successfully",
      totalInserted: totalInserted,
      newCompaniesAutoCreated: missingSymbols.length,
      newCompanies: missingSymbols,
      debug: { skippedInvalidDate, skippedNoPrice, skippedNoCompany },
    });
  } catch (err) {
    console.error("bulkUploadPriceData error:", err);
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

      if (prices.length < 50) continue;

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

    const buildOr = (val) => ({
      [Op.or]: [{ index1: val }, { index2: val }, { index3: val }],
    });

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

    let globalStart = null;
    const companyRanges = {};

    if (startDate && endDate) {
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
        filterApplied: "ALL",
        totalSymbols: 0,
        data: [],
      });
    }

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
