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
    // FIX: Remove references or ensure table exists first
    // references: {
    //   model: 'students',
    //   key: 'id'
    // }
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
    allowNull: false
  },
  fee_month_to: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  fee_year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  particulars: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('particulars');
      if (!rawValue) return [];
      try {
        return typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
      } catch {
        return [];
      }
    },
    set(value) {
      this.setDataValue('particulars', JSON.stringify(value));
    }
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
    allowNull: false
  },
  payment_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  transaction_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  payment_mode: {
    type: DataTypes.ENUM('cash', 'card', 'online', 'bank_transfer', 'cheque'),
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_notified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  suspension_warning_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  added_by: {
    type: DataTypes.INTEGER,
    allowNull: false
    // FIX: Remove references or add after table exists
    // references: {
    //   model: 'users',
    //   key: 'id'
    // }
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true
    // references: {
    //   model: 'users',
    //   key: 'id'
    // }
  }
}, {
  timestamps: true,
  underscored: true,
  // FIX: Remove indexes that are causing issues during initial sync
  // Add them after table creation via migration
  indexes: []
});

// FIX: Add relations AFTER all models are defined (in a separate file or after sync)
// Remove the relations from here initially

module.exports = Fee;