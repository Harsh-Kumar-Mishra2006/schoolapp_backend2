const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const Teacher = sequelize.define('Teacher', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {  // ← ADD THIS FIELD - REQUIRED FOR RELATIONSHIP
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  teacherId: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false
  },
  qualification: {
    type: DataTypes.STRING(100)
  },
  specialization: {
    type: DataTypes.STRING(100)
  },
  experience: {
    type: DataTypes.INTEGER,
    comment: 'Years of experience'
  },
  joiningDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  address: {
    type: DataTypes.TEXT
  }
});

Teacher.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Teacher, { foreignKey: 'userId', as: 'teacher' });

module.exports = Teacher;