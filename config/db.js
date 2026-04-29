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
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: false
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ TiDB Cloud connected successfully!');
    
    // First, disable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Sync all models in correct order
    // This will create missing tables without crashing
    await sequelize.sync({ alter: true });
    console.log('✅ All models synced successfully!');
    
    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
  } catch (error) {
    console.error('❌ Database error:', error);
    // Don't exit - just log and continue
    console.log('⚠️ Continuing despite database error...');
  }
};

module.exports = { sequelize, connectDB };