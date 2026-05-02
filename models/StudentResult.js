const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StudentResult = sequelize.define('StudentResult', {
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
  examId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Exams',
      key: 'id'
    }
  },
  // Student Details (denormalized for quick access)
  studentName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  studentEmail: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  studentClass: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  studentSection: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  studentRollNumber: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  parentEmail: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  // Subjects and Marks
  subjects: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Array of subject objects with marks'
    /* Example:
    [
      {
        "sno": 1,
        "subject": "Mathematics",
        "totalMarks": 100,
        "passingMarks": 33,
        "scoredMarks": 85
      }
    ]
    */
  },
  // Calculated fields
  totalMarksObtained: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  totalMaxMarks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('Pass', 'Fail', 'Pending'),
    allowNull: false,
    defaultValue: 'Pending'
  },
  division: {
    type: DataTypes.ENUM('Distinction', 'First', 'Second', 'Third', 'Fail', 'N/A'),
    allowNull: true
  },
  rank: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Rank in class'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  resultDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
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
  tableName: 'StudentResults'
});

// Hook to calculate result before saving
StudentResult.beforeSave(async (result) => {
  let totalObtained = 0;
  let totalMax = 0;
  let hasFailed = false;

  if (result.subjects && Array.isArray(result.subjects)) {
    result.subjects.forEach((subject, index) => {
      subject.sno = index + 1;
      totalObtained += parseFloat(subject.scoredMarks || 0);
      totalMax += parseFloat(subject.totalMarks || 0);
      if (parseFloat(subject.scoredMarks || 0) < parseFloat(subject.passingMarks || 0)) {
        hasFailed = true;
      }
    });
  }

  result.totalMarksObtained = totalObtained;
  result.totalMaxMarks = totalMax;
  
  if (totalMax > 0) {
    result.percentage = (totalObtained / totalMax) * 100;
    result.percentage = parseFloat(result.percentage.toFixed(2));
  } else {
    result.percentage = 0;
  }

  result.status = hasFailed ? 'Fail' : 'Pass';

  if (result.status === 'Pass') {
    if (result.percentage >= 75) result.division = 'Distinction';
    else if (result.percentage >= 60) result.division = 'First';
    else if (result.percentage >= 45) result.division = 'Second';
    else if (result.percentage >= 33) result.division = 'Third';
    else result.division = 'Fail';
  } else {
    result.division = 'Fail';
  }
});

// Add associations
StudentResult.associate = (models) => {
  StudentResult.belongsTo(models.Student, { foreignKey: 'studentId', as: 'student' });
  StudentResult.belongsTo(models.Exam, { foreignKey: 'examId', as: 'exam' });
  StudentResult.belongsTo(models.User, { foreignKey: 'addedBy', as: 'addedByUser' });
};

module.exports = StudentResult;