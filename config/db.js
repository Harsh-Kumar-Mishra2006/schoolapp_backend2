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
    
    // ⚠️ CRITICAL FIX: Just sync, no alter/force
    await sequelize.sync();
    console.log('✅ Models synced (no structure changes)');
    
  } catch (error) {
    console.error('❌ Database error:', error);
    // Don't throw - let the server start even if sync fails
    console.log('⚠️ Continuing despite sync error...');
  }
};

module.exports = { sequelize, connectDB };