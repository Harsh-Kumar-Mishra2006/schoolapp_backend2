const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TeacherAttendance = sequelize.define('TeacherAttendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  teacher_id: {  // ← Changed from teacherId
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'teachers',
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
  teacher_school_id: {  // ← Changed from teacherSchoolId
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Teacher ID from school system (e.g., TCH001)'
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
      fields: ['teacher_id', 'month', 'year'],  // ← Changed from teacherId
      name: 'unique_teacher_month_attendance'
    }
  ]
});

// Calculate percentage before saving
TeacherAttendance.beforeSave((attendance) => {
  if (attendance.total_working_days > 0) {  // ← Changed
    attendance.percentage = (attendance.days_present / attendance.total_working_days) * 100;  // ← Changed
    attendance.percentage = parseFloat(attendance.percentage.toFixed(2));
  } else {
    attendance.percentage = 0;
  }
  
  // Auto-calculate absent days
  attendance.days_absent = attendance.total_working_days - attendance.days_present;  // ← Changed
});

module.exports = TeacherAttendance;