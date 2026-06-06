// controllers/resultController.js (Updated version)
const StudentResult = require('../models/StudentResult');
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const User = require('../models/User');
const Parent = require('../models/Parent');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const { EXAM_TYPES, getSubjectsForClass } = require('../utils/examsConfig');

// Helper function to resolve student by identifier
const resolveStudentByIdentifier = async (identifier, transaction = null) => {
  let student = null;
  
  if (!isNaN(identifier) && identifier.toString().trim() !== '') {
    student = await Student.findByPk(parseInt(identifier), {
      include: [{ model: User, as: 'user' }],
      transaction
    });
  }
  
  if (!student) {
    student = await Student.findOne({
      where: { studentId: identifier.toString() },
      include: [{ model: User, as: 'user' }],
      transaction
    });
  }
  
  return student;
};

// Initialize exams for the year (Admin only)
const initializeExamsForYear = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can initialize exams'
      });
    }

    const { year } = req.body;
    if (!year) {
      return res.status(400).json({
        success: false,
        error: 'Year is required'
      });
    }

    const result = await Exam.initializeExamsForYear(year, req.user.id);
    
    res.json({
      success: true,
      data: result,
      message: `Initialized ${result.created.length} exams for year ${year}`
    });

  } catch (err) {
    console.error("Initialize Exams Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to initialize exams: " + err.message
    });
  }
};

// Get all available exam types
const getAvailableExamTypes = async (req, res) => {
  try {
    const exams = Object.values(EXAM_TYPES);
    res.json({
      success: true,
      data: exams
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Add student result with predefined exam type
const addStudentResultByExamType = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can add results'
      });
    }

    const { 
      studentId, 
      examType, 
      examYear,
      subjects, 
      rank, 
      remarks, 
      resultDate 
    } = req.body;

    if (!studentId || !examType || !examYear || !subjects) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, examType, examYear, subjects'
      });
    }

    // Get the student
    const student = await resolveStudentByIdentifier(studentId, transaction);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: `Student not found with ID: ${studentId}`
      });
    }

    // Get or create exam
    let exam = await Exam.findOne({
      where: { examType, examYear },
      transaction
    });

    if (!exam) {
      // Auto-create exam if it doesn't exist
      const { EXAM_SCHEDULE } = require('../utils/examConfig');
      const schedule = EXAM_SCHEDULE[examType];
      
      exam = await Exam.create({
        examType,
        examYear,
        term: schedule?.term || null,
        startDate: resultDate || new Date(),
        endDate: resultDate || new Date(),
        weightage: schedule?.weightage || 0,
        description: `${examType} for academic year ${examYear}`,
        addedBy: req.user.id
      }, { transaction });
    }

    // Check if result already exists
    const existingResult = await StudentResult.findOne({
      where: { studentId: student.id, examId: exam.id },
      transaction
    });

    if (existingResult) {
      return res.status(400).json({
        success: false,
        error: `Result for ${student.user.name} in ${examType} already exists`
      });
    }

    // Validate subjects based on class
    const expectedSubjects = getSubjectsForClass(student.class);
    const providedSubjects = subjects.map(s => s.subject);
    
    const missingSubjects = expectedSubjects.filter(s => !providedSubjects.includes(s));
    if (missingSubjects.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing subjects: ${missingSubjects.join(', ')}`
      });
    }

    // Create result
    const result = await StudentResult.create({
      studentId: student.id,
      examId: exam.id,
      studentName: student.user.name,
      studentEmail: student.user.email,
      studentClass: student.class,
      studentSection: student.section,
      studentRollNumber: student.rollNumber,
      parentEmail: student.parentEmail || null,
      subjects: subjects,
      rank: rank || null,
      remarks: remarks || null,
      resultDate: resultDate || new Date(),
      addedBy: req.user.id,
      isPublished: true
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: {
        id: result.id,
        studentId: student.studentId,
        studentName: result.studentName,
        examType: examType,
        percentage: result.percentage,
        status: result.status,
        rank: result.rank
      },
      message: `Result for ${student.user.name} in ${examType} added successfully`
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Add Result Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to add result: " + err.message
    });
  }
};

// Add bulk results by class and exam type
const addBulkResultsByClass = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can add results'
      });
    }

    const { 
      class: className, 
      section, 
      examType, 
      examYear,
      subjectMarks,
      resultDate 
    } = req.body;

    if (!className || !examType || !examYear || !subjectMarks) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: class, examType, examYear, subjectMarks'
      });
    }

    // Get all students in the class
    const students = await Student.findAll({
      where: { 
        class: className,
        ...(section && { section })
      },
      include: [{ model: User, as: 'user' }],
      transaction
    });

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No students found in class ${className}${section ? '-' + section : ''}`
      });
    }

    // Get or create exam
    let exam = await Exam.findOne({
      where: { examType, examYear },
      transaction
    });

    if (!exam) {
      const { EXAM_SCHEDULE } = require('../utils/examConfig');
      const schedule = EXAM_SCHEDULE[examType];
      
      exam = await Exam.create({
        examType,
        examYear,
        term: schedule?.term || null,
        startDate: resultDate || new Date(),
        endDate: resultDate || new Date(),
        weightage: schedule?.weightage || 0,
        description: `${examType} for academic year ${examYear}`,
        addedBy: req.user.id
      }, { transaction });
    }

    const results = [];
    const errors = [];

    for (const student of students) {
      try {
        const studentMarks = subjectMarks[student.rollNumber];
        if (!studentMarks) {
          errors.push({ rollNumber: student.rollNumber, error: 'No marks provided' });
          continue;
        }

        // Format subjects with marks
        const subjects = Object.keys(studentMarks).map(subjectName => ({
          subject: subjectName,
          totalMarks: 100, // Default max marks
          passingMarks: 33,
          scoredMarks: studentMarks[subjectName]
        }));

        const result = await StudentResult.create({
          studentId: student.id,
          examId: exam.id,
          studentName: student.user.name,
          studentEmail: student.user.email,
          studentClass: student.class,
          studentSection: student.section,
          studentRollNumber: student.rollNumber,
          parentEmail: student.parentEmail || null,
          subjects: subjects,
          resultDate: resultDate || new Date(),
          addedBy: req.user.id,
          isPublished: true
        }, { transaction });

        results.push(result);
      } catch (err) {
        errors.push({ rollNumber: student.rollNumber, error: err.message });
      }
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: {
        totalStudents: students.length,
        resultsAdded: results.length,
        errors: errors,
        exam: {
          type: examType,
          year: examYear
        }
      },
      message: `Added results for ${results.length} students in ${examType}`
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Add Bulk Results Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to add bulk results: " + err.message
    });
  }
};

// Get class performance across all exams
const getClassPerformance = async (req, res) => {
  try {
    const { class: className, section, examYear } = req.query;

    if (!className || !examYear) {
      return res.status(400).json({
        success: false,
        error: 'Class and exam year are required'
      });
    }

    const students = await Student.findAll({
      where: { 
        class: className,
        ...(section && { section })
      },
      include: [{ model: User, as: 'user' }]
    });

    const exams = await Exam.findAll({
      where: { examYear },
      order: [['startDate', 'ASC']]
    });

    const performanceData = [];

    for (const student of students) {
      const studentResults = [];
      let totalPercentage = 0;
      let examCount = 0;

      for (const exam of exams) {
        const result = await StudentResult.findOne({
          where: {
            studentId: student.id,
            examId: exam.id
          }
        });

        if (result) {
          studentResults.push({
            examType: exam.examType,
            percentage: result.percentage,
            status: result.status,
            rank: result.rank
          });
          totalPercentage += parseFloat(result.percentage);
          examCount++;
        }
      }

      performanceData.push({
        student: {
          id: student.studentId,
          name: student.user.name,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section
        },
        exams: studentResults,
        averagePercentage: examCount > 0 ? (totalPercentage / examCount).toFixed(2) : 0
      });
    }

    res.json({
      success: true,
      data: {
        class: `${className}${section ? '-' + section : ''}`,
        examYear: examYear,
        totalExams: exams.length,
        students: performanceData
      }
    });

  } catch (err) {
    console.error("Get Class Performance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch class performance"
    });
  }
};


// Get all exams (with optional filters)
const getAllExams = async (req, res) => {
  try {
    const { examYear, examType } = req.query;
    
    const where = {};
    if (examYear) where.examYear = examYear;
    if (examType) where.examType = examType;
    
    const exams = await Exam.findAll({
      where,
      order: [['examYear', 'DESC'], ['startDate', 'ASC']]
    });
    
    res.json({
      success: true,
      data: exams,
      count: exams.length
    });
  } catch (err) {
    console.error("Get All Exams Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch exams: " + err.message
    });
  }
};

// Get student results by student ID
const getStudentResult = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { examType, examYear } = req.query;
    
    // Find student
    const student = await resolveStudentByIdentifier(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }
    
    // Build query
    const where = { studentId: student.id };
    if (examType) {
      const exam = await Exam.findOne({ where: { examType, examYear } });
      if (exam) where.examId = exam.id;
    }
    
    const results = await StudentResult.findAll({
      where,
      include: [{ model: Exam, as: 'exam' }],
      order: [['resultDate', 'DESC']]
    });
    
    res.json({
      success: true,
      data: results
    });
  } catch (err) {
    console.error("Get Student Result Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch student results: " + err.message
    });
  }
};

// Get all results with pagination and filters
const getAllResults = async (req, res) => {
  try {
    const { page = 1, limit = 50, class: className, examType, examYear } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (className) where.studentClass = className;
    if (examYear) {
      const exam = await Exam.findOne({ where: { examType, examYear } });
      if (exam) where.examId = exam.id;
    }
    
    const { count, rows } = await StudentResult.findAndCountAll({
      where,
      include: [
        { model: Exam, as: 'exam' },
        { model: Student, as: 'student' }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error("Get All Results Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch results: " + err.message
    });
  }
};

// Update student result
const updateStudentResult = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { subjects, rank, remarks, isPublished } = req.body;
    
    const result = await StudentResult.findByPk(id, { transaction });
    if (!result) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Result not found'
      });
    }
    
    if (subjects) result.subjects = subjects;
    if (rank !== undefined) result.rank = rank;
    if (remarks !== undefined) result.remarks = remarks;
    if (isPublished !== undefined) result.isPublished = isPublished;
    
    await result.save({ transaction });
    await transaction.commit();
    
    res.json({
      success: true,
      data: result,
      message: 'Result updated successfully'
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Update Result Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update result: " + err.message
    });
  }
};

// Delete result
const deleteResult = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    const result = await StudentResult.findByPk(id, { transaction });
    if (!result) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Result not found'
      });
    }
    
    await result.destroy({ transaction });
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Result deleted successfully'
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Delete Result Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete result: " + err.message
    });
  }
};

// Get results by class
const getClassResults = async (req, res) => {
  try {
    const { class: className, section, examType, examYear } = req.query;
    
    if (!className || !examType || !examYear) {
      return res.status(400).json({
        success: false,
        error: 'Class, exam type, and exam year are required'
      });
    }
    
    // Find the exam
    const exam = await Exam.findOne({
      where: { examType, examYear }
    });
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        error: 'Exam not found'
      });
    }
    
    // Find all students in the class
    const students = await Student.findAll({
      where: {
        class: className,
        ...(section && { section })
      },
      include: [{ model: User, as: 'user' }]
    });
    
    // Get results for these students
    const results = await StudentResult.findAll({
      where: {
        studentId: students.map(s => s.id),
        examId: exam.id
      },
      include: [{ model: Student, as: 'student' }]
    });
    
    // Combine student info with results
    const classResults = students.map(student => {
      const result = results.find(r => r.studentId === student.id);
      return {
        student: {
          id: student.studentId,
          name: student.user.name,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section
        },
        result: result || null
      };
    });
    
    res.json({
      success: true,
      data: {
        exam: { type: examType, year: examYear },
        totalStudents: students.length,
        resultsPublished: results.length,
        students: classResults
      }
    });
  } catch (err) {
    console.error("Get Class Results Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch class results: " + err.message
    });
  }
};
// Then export properly
module.exports = {
  initializeExamsForYear,
  getAvailableExamTypes,
  addStudentResultByExamType,
  addBulkResultsByClass,
  getStudentResult,
  getAllResults,
  updateStudentResult,
  deleteResult,
  getClassResults,
  getClassPerformance,
  resolveStudentByIdentifier,
  getAllExams
};