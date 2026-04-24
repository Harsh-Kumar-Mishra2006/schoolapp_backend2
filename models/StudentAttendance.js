const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StudentAttendance = sequelize.define('StudentAttendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  class: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  rollNumber: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  section: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  parentEmail: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  month: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Month name (January, February, etc.)'
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  totalWorkingDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  daysPresent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  daysAbsent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Manual remark added by admin'
  },
  addedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['studentId', 'month', 'year'],
      name: 'unique_student_month_attendance'
    }
  ]
});

// Calculate percentage before saving
StudentAttendance.beforeSave((attendance) => {
  if (attendance.totalWorkingDays > 0) {
    attendance.percentage = (attendance.daysPresent / attendance.totalWorkingDays) * 100;
    attendance.percentage = parseFloat(attendance.percentage.toFixed(2));
  } else {
    attendance.percentage = 0;
  }
  
  // Auto-calculate absent days
  attendance.daysAbsent = attendance.totalWorkingDays - attendance.daysPresent;
});

module.exports = StudentAttendance;