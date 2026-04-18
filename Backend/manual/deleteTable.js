const { sequelize } = require('../models/model');

const deleteDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected.');

    await sequelize.drop(); // DROPS ALL TABLES
    console.log('🧨 Database deleted successfully (all tables dropped).');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting database:', error);
    process.exit(1);
  }
};

deleteDatabase();
