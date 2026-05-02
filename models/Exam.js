const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Exam = sequelize.define('Exam', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  examType: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'e.g., Quarterly, Half-Yearly, Annual, Pre-board, Unit Test'
  },
  examYear: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  term: {
    type: DataTypes.STRING(20),
    comment: 'Term 1, Term 2, etc.'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  addedBy: {
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

Exam.associate = (models) => {
  Exam.belongsTo(models.User, { foreignKey: 'addedBy', as: 'addedByUser' });
  Exam.hasMany(models.StudentResult, { foreignKey: 'examId', as: 'results' });
};
module.exports = Exam;