// Load environment variables FIRST
require('dotenv').config({ path: '../.env' }); // Adjust path as needed

const { sequelize } = require('../config/db');

async function fixMissingColumns() {
  try {
    console.log('🔧 Fixing missing columns...');
    
    // Test connection first
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    // Add userId to Students table if missing
    try {
      await sequelize.query(`
        ALTER TABLE Students 
        ADD COLUMN IF NOT EXISTS userId INT
      `);
      console.log('✅ Added userId to Students');
    } catch (e) {
      console.log('Students column check:', e.message);
    }
    
    // Add parentEmail to Students
    try {
      await sequelize.query(`
        ALTER TABLE Students 
        ADD COLUMN IF NOT EXISTS parentEmail VARCHAR(100) NULL
      `);
      console.log('✅ Added parentEmail to Students');
    } catch (e) {
      console.log('ParentEmail column check:', e.message);
    }
    
    // Add userId to Teachers table
    try {
      await sequelize.query(`
        ALTER TABLE Teachers 
        ADD COLUMN IF NOT EXISTS userId INT
      `);
      console.log('✅ Added userId to Teachers');
    } catch (e) {
      console.log('Teachers column check:', e.message);
    }
    
    // Add userId to Parents table
    try {
      await sequelize.query(`
        ALTER TABLE Parents 
        ADD COLUMN IF NOT EXISTS userId INT
      `);
      console.log('✅ Added userId to Parents');
    } catch (e) {
      console.log('Parents column check:', e.message);
    }
    
    // Add tempPassword to Users table
    try {
      await sequelize.query(`
        ALTER TABLE Users 
        ADD COLUMN IF NOT EXISTS tempPassword VARCHAR(255) NULL
      `);
      console.log('✅ Added tempPassword to Users');
    } catch (e) {
      console.log('Users column check:', e.message);
    }
    
    console.log('✅ Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

fixMissingColumns();