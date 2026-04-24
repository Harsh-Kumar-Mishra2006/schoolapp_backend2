const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DailyAttendance = sequelize.define('DailyAttendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  entityType: {
    type: DataTypes.ENUM('student', 'teacher'),
    allowNull: false
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Student ID or Teacher ID'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'late', 'half-day'),
    allowNull: false,
    defaultValue: 'present'
  },
  checkInTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  checkOutTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  markedBy: {
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
      fields: ['entityType', 'entityId', 'date'],
      name: 'unique_daily_attendance'
    }
  ]
});

module.exports = DailyAttendance;