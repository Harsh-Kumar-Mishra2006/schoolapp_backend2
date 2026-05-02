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
    
    // Sync without altering existing tables
    await sequelize.sync({ alter: false });
    console.log('✅ Models synced successfully');
    
  } catch (error) {
    console.error('❌ Database error:', error);
    // Don't exit - let the server try to continue
  }
};

module.exports = { sequelize, connectDB };