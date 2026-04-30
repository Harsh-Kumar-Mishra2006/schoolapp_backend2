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
      model: 'students',
      key: 'id'
    }
  },
  examId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'exams',
      key: 'id'
    }
  },
  // Individual subjects results stored as JSON array
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
      },
      {
        "sno": 2,
        "subject": "Science",
        "totalMarks": 100,
        "passingMarks": 33,
        "scoredMarks": 78
      }
    ]
    */
  },
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
    allowNull: true,
    comment: 'Additional comments from admin'
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
      model: 'users',
      key: 'id'
    }
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether result is published to student/parent portal'
  }
}, {
  timestamps: true
});

// Calculate result before saving
StudentResult.beforeSave(async (result) => {
  // Calculate totals and percentage
  let totalObtained = 0;
  let totalMax = 0;
  let hasFailed = false;

  if (result.subjects && Array.isArray(result.subjects)) {
    result.subjects.forEach((subject, index) => {
      // Add serial number
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

  // Determine status
  result.status = hasFailed ? 'Fail' : 'Pass';

  // Determine division (only for Pass)
  if (result.status === 'Pass') {
    if (result.percentage >= 75) {
      result.division = 'Distinction';
    } else if (result.percentage >= 60) {
      result.division = 'First';
    } else if (result.percentage >= 45) {
      result.division = 'Second';
    } else if (result.percentage >= 33) {
      result.division = 'Third';
    } else {
      result.division = 'Fail';
      result.status = 'Fail';
    }
  } else {
    result.division = 'Fail';
  }
});

module.exports = StudentResult;