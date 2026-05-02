const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Student = require('./Student');

const Fee = sequelize.define('Fee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'studentId'
  },
  currentMonth: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  currentYear: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  pendingFrom: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  pendingFromYear: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  monthsPending: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  monthlyFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  transportFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  examFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  tuitionFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  lateFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  amountInWords: {
    type: DataTypes.STRING(255)
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Partially Paid', 'Paid', 'Overdue', 'Suspended'),
    defaultValue: 'Pending'
  },
  isSuspended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  suspensionDate: {
    type: DataTypes.DATEONLY
  },
  suspensionReason: {
    type: DataTypes.TEXT
  },
  lastPaymentDate: {
    type: DataTypes.DATEONLY
  },
  lastPaymentAmount: {
    type: DataTypes.DECIMAL(10, 2)
  },
  totalPaid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  balanceAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  remarks: {
    type: DataTypes.TEXT
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  addedBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  tableName: 'Fees'
});

Fee.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
Student.hasMany(Fee, { foreignKey: 'studentId', as: 'fees' });

module.exports = Fee;