const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

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
      model: 'students',
      key: 'id'
    }
  },
  // Fee details
  currentMonth: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Current month (e.g., April)'
  },
  currentYear: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  pendingFrom: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Month from which fee is pending (e.g., January)'
  },
  pendingFromYear: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  monthsPending: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of months fee is pending'
  },
  // Fee components
  monthlyFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  transportFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  examFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  tuitionFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  lateFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Late fee penalty'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  amountInWords: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  // Status
  status: {
    type: DataTypes.ENUM('Pending', 'Partially Paid', 'Paid', 'Overdue', 'Suspended'),
    allowNull: false,
    defaultValue: 'Pending'
  },
  isSuspended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Student suspended due to fee pending > 6 months'
  },
  suspensionDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date when student was suspended'
  },
  suspensionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for suspension'
  },
  // Payment tracking
  lastPaymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  lastPaymentAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  totalPaid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  balanceAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  // Additional info
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  addedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether fee details are visible to student/parent'
  }
}, {
  timestamps: true
});

// Calculate total amount and months pending before saving
Fee.beforeSave(async (fee) => {
  // Calculate total amount
  fee.totalAmount = parseFloat(fee.monthlyFee || 0) + 
                    parseFloat(fee.transportFee || 0) + 
                    parseFloat(fee.examFee || 0) + 
                    parseFloat(fee.tuitionFee || 0) +
                    parseFloat(fee.lateFee || 0);
  
  // Calculate months pending
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  const pendingIndex = months.indexOf(fee.pendingFrom);
  const currentIndex = months.indexOf(fee.currentMonth);
  
  let monthsDiff = currentIndex - pendingIndex;
  if (monthsDiff < 0) {
    monthsDiff += 12;
  }
  
  // Add year difference
  monthsDiff += (fee.currentYear - fee.pendingFromYear) * 12;
  fee.monthsPending = monthsDiff;
  
  // Check if suspension needed (more than 6 months pending)
  if (fee.monthsPending > 6 && fee.status !== 'Paid') {
    fee.isSuspended = true;
    fee.status = 'Suspended';
    if (!fee.suspensionDate) {
      fee.suspensionDate = new Date();
      fee.suspensionReason = `Fee pending for ${fee.monthsPending} months (exceeds 6 months limit)`;
    }
  } else {
    fee.isSuspended = false;
  }
  
  // Calculate balance
  fee.balanceAmount = fee.totalAmount - fee.totalPaid;
});

module.exports = Fee;