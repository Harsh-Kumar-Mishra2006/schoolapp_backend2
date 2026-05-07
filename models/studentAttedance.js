const { Op } = require('sequelize');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const DailyStudentAttendance = require('./DailyStudentAttendance');

const StudentAttendance = sequelize.define('StudentAttendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
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
  roll_number: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  section: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  parent_email: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  month: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  total_working_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  days_present: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  days_absent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  days_late: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  days_half_day: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0
  },
  semester_total_present: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Cumulative present days for the semester'
  },
  semester_total_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Cumulative working days for the semester'
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  added_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  underscored: true,
  hooks: {
    beforeSave: async (attendance) => {
      if (attendance.total_working_days > 0) {
        attendance.percentage = (attendance.days_present / attendance.total_working_days) * 100;
        attendance.percentage = parseFloat(attendance.percentage.toFixed(2));
      } else {
        attendance.percentage = 0;
      }
      
      attendance.days_absent = attendance.total_working_days - attendance.days_present;
    }
  },
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'month', 'year'],
      name: 'unique_student_month_attendance'
    }
  ]
});

// Function to recalculate monthly attendance from daily records
StudentAttendance.recalculateFromDaily = async (studentId, month, year, transaction) => {
  const startDate = new Date(year, new Date(Date.parse(month + " 1, " + year)).getMonth(), 1);
  const endDate = new Date(year, new Date(Date.parse(month + " 1, " + year)).getMonth() + 1, 0);
  
  const dailyRecords = await DailyStudentAttendance.findAll({
    where: {
      student_id: studentId,
      date: {
        [Op.between]: [startDate, endDate]
      }
    },
    transaction
  });
  
  const totalWorkingDays = dailyRecords.length;
  const daysPresent = dailyRecords.filter(r => r.status === 'present').length;
  const daysLate = dailyRecords.filter(r => r.status === 'late').length;
  const daysHalfDay = dailyRecords.filter(r => r.status === 'half-day').length;
  
  const [attendance, created] = await StudentAttendance.findOrCreate({
    where: { student_id: studentId, month, year },
    defaults: {
      student_id: studentId,
      name: '',
      email: '',
      class: '',
      roll_number: '',
      section: '',
      month,
      year,
      total_working_days: totalWorkingDays,
      days_present: daysPresent,
      days_late: daysLate,
      days_half_day: daysHalfDay,
      added_by: 1 // System
    },
    transaction
  });
  
  if (!created) {
    await attendance.update({
      total_working_days: totalWorkingDays,
      days_present: daysPresent,
      days_late: daysLate,
      days_half_day: daysHalfDay
    }, { transaction });
  }
  
  return attendance;
};

module.exports = StudentAttendance;