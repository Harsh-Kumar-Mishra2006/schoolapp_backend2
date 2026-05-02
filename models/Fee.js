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
  hooks: {
    beforeCreate: (fee) => {
      // Calculate total amount from particulars
      let particulars = fee.particulars;
      if (typeof particulars === 'string') {
        try {
          particulars = JSON.parse(particulars);
        } catch(e) {
          particulars = [];
        }
      }
      
      if (Array.isArray(particulars)) {
        fee.total_amount = particulars.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      }
      
      // Calculate balance
      fee.balance_due = fee.total_amount - (fee.amount_paid || 0);
      
      // Set status
      const today = new Date();
      const dueDate = new Date(fee.due_date);
      
      if (fee.balance_due <= 0) {
        fee.status = 'paid';
      } else if ((fee.amount_paid || 0) > 0) {
        fee.status = 'partial';
      } else if (dueDate < today) {
        fee.status = 'overdue';
      } else {
        fee.status = 'pending';
      }
    },
    beforeUpdate: (fee) => {
      // Calculate balance
      fee.balance_due = fee.total_amount - (fee.amount_paid || 0);
      
      // Set status
      const today = new Date();
      const dueDate = new Date(fee.due_date);
      
      if (fee.balance_due <= 0) {
        fee.status = 'paid';
        if (!fee.payment_date) fee.payment_date = new Date();
      } else if ((fee.amount_paid || 0) > 0) {
        fee.status = 'partial';
      } else if (dueDate < today) {
        fee.status = 'overdue';
      } else {
        fee.status = 'pending';
      }
    }
  },
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

// Relations
Fee.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Student.hasMany(Fee, { foreignKey: 'student_id', as: 'fees' });

module.exports = Fee;