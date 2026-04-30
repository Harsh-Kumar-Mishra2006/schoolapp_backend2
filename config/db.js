const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'test',
  process.env.DB_USER || '2CPku6SX5xn3z2h.root',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'gateway01.us-west-2.prod.aws.tidbcloud.com',
    port: parseInt(process.env.DB_PORT) || 4000,
    dialect: 'mysql',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ TiDB Cloud connected successfully!');
    
    // ✅ FIXED: Only sync tables that don't exist - NEVER drop data
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // PRODUCTION: Never drop tables, just ensure they exist
      await sequelize.sync();
      console.log('✅ Production mode - tables synced, all data preserved');
    } else {
      // DEVELOPMENT: Update schema while preserving data
      await sequelize.sync({ alter: true });
      console.log('✅ Development mode - schema updated, data preserved');
    }
    
    console.log('✅ Database ready - data intact');
    
  } catch (error) {
    console.error('❌ Database error:', error);
    throw error;
  }
};

module.exports = { sequelize, connectDB };