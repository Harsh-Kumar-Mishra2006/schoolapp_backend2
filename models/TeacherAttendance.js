const { DataTypes, Op } = require('sequelize');
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

// Static method to recalculate monthly attendance from daily records
TeacherAttendance.recalculateFromDaily = async function(teacherId, month, year, transaction) {
  // Get all daily attendance records for this teacher in the given month
  const startDate = new Date(year, new Date(Date.parse(month + " 1, " + year)).getMonth(), 1);
  const endDate = new Date(year, new Date(Date.parse(month + " 1, " + year)).getMonth() + 1, 0);
  
  const dailyRecords = await DailyTeacherAttendance.findAll({
    where: {
      teacher_id: teacherId,
      date: {
        [Op.between]: [startDate, endDate]
      }
    },
    transaction
  });
  
  // Calculate totals
  const totalWorkingDays = dailyRecords.length;
  const daysPresent = dailyRecords.filter(r => r.status === 'present').length;
  const daysAbsent = dailyRecords.filter(r => r.status === 'absent').length;
  const daysLate = dailyRecords.filter(r => r.status === 'late').length;
  const percentage = totalWorkingDays > 0 ? (daysPresent / totalWorkingDays) * 100 : 0;
  
  // Update or create monthly record
  const [monthlyAttendance, created] = await TeacherAttendance.findOrCreate({
    where: {
      teacher_id: teacherId,
      month: month,
      year: year
    },
    defaults: {
      teacher_id: teacherId,
      month: month,
      year: year,
      total_working_days: totalWorkingDays,
      days_present: daysPresent,
      days_absent: daysAbsent,
      days_late: daysLate,
      percentage: percentage
    },
    transaction
  });
  
  if (!created) {
    await monthlyAttendance.update({
      total_working_days: totalWorkingDays,
      days_present: daysPresent,
      days_absent: daysAbsent,
      days_late: daysLate,
      percentage: percentage
    }, { transaction });
  }
  
  return monthlyAttendance;
};

module.exports = TeacherAttendance;