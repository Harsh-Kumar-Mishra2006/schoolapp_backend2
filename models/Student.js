const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const Student = sequelize.define('Student', {
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
  studentId: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false
  },
  rollNumber: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  class: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  section: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  admissionDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  fatherName: {
    type: DataTypes.STRING(100)
  },
  motherName: {
    type: DataTypes.STRING(100)
  },
  // models/Student.js (you already have this ✅)
  parentEmail: {
    type: DataTypes.STRING(100),
    allowNull: true  // Optional but should be stored during student creation
  },
  address: {
    type: DataTypes.TEXT
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other')
  },
  bloodGroup: {
    type: DataTypes.STRING(5)
  }
});

// Relationships
Student.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Student, { foreignKey: 'userId', as: 'student' });


module.exports = Student;