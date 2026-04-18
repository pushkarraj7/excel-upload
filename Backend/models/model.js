const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Company = sequelize.define(
  "Company",
  {
    symbol: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    companyName: DataTypes.STRING,
    marketCap: DataTypes.STRING,
    index1: DataTypes.STRING,
    index2: DataTypes.STRING,
    index3: DataTypes.STRING,
  },
  {
    tableName: "companies",
    timestamps: true,
  }
);

const PriceData = sequelize.define(
  "PriceData",
  {
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    closePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    priceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    tableName: "price_data",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["companyId", "priceDate"],
      },
    ],
  }
);

// const MovingAverage = sequelize.define(
//   "MovingAverage",
//   {
//     companyId: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },
//     shortWindow: DataTypes.INTEGER,
//     longWindow: DataTypes.INTEGER,
//     shortAvg: DataTypes.DECIMAL(10, 4),
//     longAvg: DataTypes.DECIMAL(10, 4),
//     signal: {
//       type: DataTypes.ENUM("BUY", "SELL", "NONE"),
//       defaultValue: "NONE",
//     },
//     endDate: DataTypes.DATEONLY,
//   },
//   {
//     tableName: "moving_averages",
//     timestamps: true,
//   }
// );

Company.hasMany(PriceData, { foreignKey: "companyId" });
PriceData.belongsTo(Company, { foreignKey: "companyId" });

// Company.hasMany(MovingAverage, { foreignKey: "companyId" });
// MovingAverage.belongsTo(Company, { foreignKey: "companyId" });

module.exports = {
  sequelize,
  Company,
  PriceData,
  // MovingAverage
};
