// models/Exam.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { EXAM_TYPES, EXAM_TERMS, EXAM_SCHEDULE } = require('../utils/examsConfig');

const Exam = sequelize.define('Exam', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  examType: {
    type: DataTypes.ENUM(Object.values(EXAM_TYPES)),
    allowNull: false
  },
  examYear: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  term: {
    type: DataTypes.ENUM(Object.values(EXAM_TERMS)),
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  weightage: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Weightage percentage for final calculation'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  addedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  tableName: 'Exams'
});

// Initialize exams for a new academic year
Exam.initializeExamsForYear = async (year, addedBy = 1) => {
  const created = [];
  const errors = [];

  for (const [examType, schedule] of Object.entries(EXAM_SCHEDULE)) {
    try {
      // Calculate start and end dates for the exam (simplified)
      const startDate = new Date(year, getMonthNumber(schedule.month), 1);
      const endDate = new Date(year, getMonthNumber(schedule.month) + 1, 0);
      
      const [exam, created_flag] = await Exam.findOrCreate({
        where: { examType, examYear: year },
        defaults: {
          examType,
          examYear: year,
          term: schedule.term,
          startDate,
          endDate,
          weightage: schedule.weightage,
          description: `${examType} for academic year ${year}`,
          addedBy
        }
      });
      
      if (created_flag) {
        created.push(exam);
      }
    } catch (err) {
      errors.push({ examType, error: err.message });
    }
  }
  
  return { created, errors };
};

function getMonthNumber(monthName) {
  const months = {
    'July': 6, 'August': 7, 'September': 8, 'November': 10,
    'December': 11, 'February': 1, 'March': 2
  };
  return months[monthName] || 0;
}

module.exports = Exam;