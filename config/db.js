const { Sequelize } = require('sequelize');
require('dotenv').config();

// Initialize sequelize
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

// Connect function
const connectDB = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ TiDB Cloud connected successfully!');
    
    // Disable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Drop all tables (clean slate)
    await sequelize.drop({ cascade: true });
    console.log('✅ Dropped all existing tables');
    
    // Sync all models
    await sequelize.sync({ force: true });
    console.log('✅ All models synced successfully!');
    
    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
  } catch (error) {
    console.error('❌ Database error:', error);
    throw error;
  }
};

module.exports = { sequelize, connectDB };