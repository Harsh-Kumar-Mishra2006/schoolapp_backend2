// scripts/initializeExams.js
const { sequelize } = require('../config/db');
const Exam = require('../models/Exam');

async function initializeExams() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    const currentYear = new Date().getFullYear();
    const result = await Exam.initializeExamsForYear(currentYear, 1);
    
    console.log(`✅ Initialized ${result.created.length} exams for year ${currentYear}`);
    result.created.forEach(exam => {
      console.log(`   - ${exam.examType}`);
    });
    
    if (result.errors.length > 0) {
      console.log('⚠️ Errors:', result.errors);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to initialize exams:', error);
    process.exit(1);
  }
}

initializeExams();