const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');
const Student = require('./Student');

const Fee = sequelize.define('Fee', {
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
  student_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  student_email: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  parent_email: {
    type: DataTypes.STRING(100),
    allowNull: true
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
  fee_month_from: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Starting month (e.g., January)'
  },
  fee_month_to: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Ending month (e.g., December)'
  },
  fee_year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  particulars: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'JSON string of fee particulars with amounts'
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  amount_paid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  balance_due: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('pending', 'partial', 'paid', 'overdue'),
    defaultValue: 'pending'
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Last date to pay fee'
  },
  payment_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  transaction_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Payment transaction reference'
  },
  payment_mode: {
    type: DataTypes.ENUM('cash', 'card', 'online', 'bank_transfer', 'cheque'),
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Admin remarks or notes'
  },
  is_notified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether student/parent has been notified'
  },
  suspension_warning_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether suspension warning has been sent'
  },
  added_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['student_id', 'fee_year'],
      name: 'idx_student_fee_year'
    },
    {
      fields: ['status'],
      name: 'idx_fee_status'
    },
    {
      fields: ['due_date'],
      name: 'idx_due_date'
    },
    {
      fields: ['student_email', 'parent_email'],
      name: 'idx_fee_emails'
    }
  ]
});

// Calculate balance before saving
Fee.beforeSave((fee) => {
  // Parse particulars if it's a string
  if (typeof fee.particulars === 'string') {
    try {
      fee.particulars = JSON.parse(fee.particulars);
    } catch (e) {
      // Keep as is
    }
  }
  
  // Calculate total amount from particulars
  if (Array.isArray(fee.particulars)) {
    fee.total_amount = fee.particulars.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }
  
  // Calculate balance
  fee.balance_due = fee.total_amount - fee.amount_paid;
  
  // Update status based on payment
  if (fee.balance_due <= 0) {
    fee.status = 'paid';
    fee.payment_date = fee.payment_date || new Date();
  } else if (fee.amount_paid > 0) {
    fee.status = 'partial';
  } else {
    // Check if overdue
    const today = new Date();
    const dueDate = new Date(fee.due_date);
    if (dueDate < today) {
      fee.status = 'overdue';
    } else {
      fee.status = 'pending';
    }
  }
  
  // Convert particulars back to string for storage
  if (typeof fee.particulars === 'object') {
    fee.particulars = JSON.stringify(fee.particulars);
  }
});

// Relations
Fee.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Student.hasMany(Fee, { foreignKey: 'student_id', as: 'fees' });

module.exports = Fee;