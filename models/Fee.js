// models/Fee.js - Updated for TiDB (use lowercase/snake_case)
const Fee = sequelize.define('Fee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'student_id',  // Map to snake_case
  },
  feeMonth: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'fee_month',  // Map to snake_case
  },
  feeYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'fee_year',  // Map to snake_case
  },
  feeComponents: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    field: 'fee_components',
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'total_amount',
  },
  totalPaid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'total_paid',
  },
  balanceAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'balance_amount',
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'Pending',
  },
  payments: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  lastPaymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'last_payment_date',
  },
  lastPaymentAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'last_payment_amount',
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'due_date',
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  addedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'added_by',
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_published',
  },
}, {
  timestamps: true,
  tableName: 'Fees',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});