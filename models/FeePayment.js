const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FeePayment = sequelize.define('FeePayment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  feeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'fees',
      key: 'id'
    }
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    }
  },
  paymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  amountPaid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paymentMode: {
    type: DataTypes.ENUM('Cash', 'Cheque', 'Online', 'Bank Transfer', 'DD'),
    allowNull: false
  },
  transactionId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Transaction reference number'
  },
  receiptNumber: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recordedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  timestamps: true
});

module.exports = FeePayment;