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
    
    // Force sync to avoid UNIQUE KEY errors
    // This drops and recreates all tables
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.drop({ cascade: true });
    console.log('✅ Dropped all existing tables');
    await sequelize.sync({ force: true });
    console.log('✅ All models synced successfully!');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
  } catch (error) {
    console.error('❌ Database error:', error);
    throw error;
  }
};

module.exports = { sequelize, connectDB };