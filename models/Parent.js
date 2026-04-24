const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const Parent = sequelize.define('Parent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  occupation: {
    type: DataTypes.STRING(100)
  },
  address: {
    type: DataTypes.TEXT
  },
  children: {
    type: DataTypes.JSON, // Store array of student IDs
    defaultValue: []
  }
});

Parent.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Parent, { foreignKey: 'userId', as: 'parent' });

module.exports = Parent;