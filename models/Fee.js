// models/Fee.js
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
    references: {
      model: 'Students',
      key: 'id'
    }
  },
  // Fee components as JSON array (flexible structure)
  feeComponents: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of fee components with name and amount'
  },
  // Fee metadata
  feeMonth: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Month for which fee is due (e.g., January)'
  },
  feeYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Year for which fee is due'
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  // Calculated fields
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  totalPaid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  balanceAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  // Status and tracking
  status: {
    type: DataTypes.ENUM('Pending', 'Partially Paid', 'Paid', 'Overdue'),
    defaultValue: 'Pending'
  },
  // Payment tracking
  payments: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of payment transactions'
  },
  lastPaymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  lastPaymentAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  // Additional info
  remarks: {
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
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  tableName: 'Fees',
  indexes: [
    {
      unique: true,
      fields: ['studentId', 'feeMonth', 'feeYear'],
      name: 'unique_student_monthly_fee'
    },
    {
      fields: ['status', 'dueDate']
    }
  ]
});

// Hook to calculate total amount before saving
Fee.beforeSave(async (fee) => {
  if (fee.feeComponents && Array.isArray(fee.feeComponents)) {
    const total = fee.feeComponents.reduce((sum, component) => {
      return sum + (parseFloat(component.amount) || 0);
    }, 0);
    fee.totalAmount = total;
    fee.balanceAmount = total - (parseFloat(fee.totalPaid) || 0);
  }
});

// Helper method to add payment
Fee.prototype.addPayment = async function(paymentData, transaction) {
  const payments = this.payments || [];
  const newPayment = {
    id: payments.length + 1,
    date: paymentData.date || new Date().toISOString().split('T')[0],
    amount: parseFloat(paymentData.amount),
    mode: paymentData.mode,
    receiptNo: paymentData.receiptNo || `REC-${Date.now()}`,
    collectedBy: paymentData.collectedBy,
    remarks: paymentData.remarks || null
  };
  
  payments.push(newPayment);
  const newTotalPaid = (parseFloat(this.totalPaid) || 0) + parseFloat(paymentData.amount);
  const newBalanceAmount = (parseFloat(this.totalAmount) || 0) - newTotalPaid;
  
  let newStatus = this.status;
  if (newBalanceAmount <= 0) {
    newStatus = 'Paid';
  } else if (newTotalPaid > 0) {
    newStatus = 'Partially Paid';
  } else {
    newStatus = 'Pending';
  }
  
  await this.update({
    payments: payments,
    totalPaid: newTotalPaid,
    balanceAmount: newBalanceAmount,
    status: newStatus,
    lastPaymentDate: newPayment.date,
    lastPaymentAmount: newPayment.amount
  }, { transaction });
  
  return newPayment;
};

// Associations
Fee.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
Student.hasMany(Fee, { foreignKey: 'studentId', as: 'fees' });

module.exports = Fee;