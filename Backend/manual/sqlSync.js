const { sequelize } = require('../models/model');

const syncDatabase = async () => {
    try {
        await sequelize.sync({ alter: true }); // or use force: true for clean re-creation
        console.log('✅ All tables synced successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error syncing tables:', error);
        process.exit(1);
    }
};

syncDatabase();
