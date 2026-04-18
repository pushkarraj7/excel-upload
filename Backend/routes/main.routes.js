const express = require('express');
const router = express.Router();
const mainController = require('../controllers/main.controller')
const multer = require('multer');
const path = require('path');
const fs = require("fs");

// Ensure directory exists
const uploadDir = path.join(__dirname, "../uploads/initial-company");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config (ROUTE-LEVEL)
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, "initial-company.xlsx"); // always replace
    },
  }),
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files allowed"), false);
    }
  },
});


// Ensure directory exists
const priceUploadDir = path.join(__dirname, "../uploads/price-data");

if (!fs.existsSync(priceUploadDir)) {
  fs.mkdirSync(priceUploadDir, { recursive: true });
}

// Multer config for PRICE DATA (ROUTE-LEVEL)
const uploadPriceData = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, priceUploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, "price-data.xlsx"); // always replace
    },
  }),
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel (.xlsx) files are allowed"), false);
    }
  },
});

// company.routes.js
router.post("/upload-companies", upload.single("file"), mainController.uploadCompanies);

// price.routes.js
router.post("/bulk-upload-prices", uploadPriceData.single("file"), mainController.bulkUploadPriceData);

// average.routes.js
router.get("/calculate-average", mainController.getAllMovingAveragesTable);
router.get('/company-stats', mainController.getCompanyCount);
router.get('/index-filter', mainController.getIndexFilters);

module.exports = router;