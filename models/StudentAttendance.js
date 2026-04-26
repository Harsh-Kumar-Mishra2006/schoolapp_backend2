const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StudentAttendance = sequelize.define('StudentAttendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {  // ← Changed from studentId
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
  roll_number: {  // ← Changed from rollNumber
    type: DataTypes.STRING(20),
    allowNull: false
  },
  section: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  parent_email: {  // ← Changed from parentEmail
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
  total_working_days: {  // ← Changed from totalWorkingDays
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  days_present: {  // ← Changed from daysPresent
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  days_absent: {  // ← Changed from daysAbsent
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
  added_by: {  // ← Changed from addedBy
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  underscored: true,  // ← ADD THIS - important!
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'month', 'year'],  // ← Changed from student_Id
      name: 'unique_student_month_attendance'
    }
  ]
});

// Calculate percentage before saving
StudentAttendance.beforeSave((attendance) => {
  if (attendance.total_working_days > 0) {  // ← Changed from totalWorkingDays
    attendance.percentage = (attendance.days_present / attendance.total_working_days) * 100;  // ← Changed
    attendance.percentage = parseFloat(attendance.percentage.toFixed(2));
  } else {
    attendance.percentage = 0;
  }
  
  // Auto-calculate absent days
  attendance.days_absent = attendance.total_working_days - attendance.days_present;  // ← Changed
});

module.exports = StudentAttendance;