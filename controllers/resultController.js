const StudentResult = require('../models/StudentResult');
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const User = require('../models/User');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const Parent = require('../models/Parent');


// ============= ADD STUDENT RESULT (Admin only) =============
const addStudentResult = async (req, res) => {
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
      examId,
      subjects,
      rank,
      remarks,
      resultDate
    } = req.body;

    if (!studentId || !examId || !subjects || !Array.isArray(subjects)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, examId, subjects (array)'
      });
    }

    const student = await Student.findByPk(studentId, {
      include: [{ model: User, as: 'user' }]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    const exam = await Exam.findByPk(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        error: 'Exam not found'
      });
    }

    const existingResult = await StudentResult.findOne({
      where: { studentId, examId }
    });

    if (existingResult) {
      return res.status(400).json({
        success: false,
        error: `Result for ${student.user.name} in ${exam.examType} already exists.`
      });
    }

    const result = await StudentResult.create({
      studentId,
      examId,
      subjects,
      rank: rank || null,
      remarks: remarks || null,
      resultDate: resultDate || new Date(),
      addedBy: req.user.id,
      isPublished: true,
      parentEmail: student.parentEmail || null
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: result,
      message: `Result for ${student.user.name} added successfully`
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

// ============= GET STUDENT RESULT (Student/Parent Dashboard) =============
const getStudentResult = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { examId, examType, year } = req.query;

    const requestingUser = req.user;
    const student = await Student.findByPk(studentId, {
      include: [{ model: User, as: 'user' }]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Authorization check
    const isStudent = requestingUser.role === 'student' && requestingUser.id === student.userId;
    const isParent = requestingUser.role === 'parent';
    const isTeacher = requestingUser.role === 'teacher';
    const isAdmin = requestingUser.role === 'admin';

    // For parent: check if this student is their child
    let isChildOfParent = false;
    if (isParent) {
      const parent = await Parent.findOne({ where: { userId: requestingUser.id } });
      if (parent && parent.children && parent.children.includes(studentId)) {
        isChildOfParent = true;
      }
    }

    if (!isStudent && !isChildOfParent && !isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own results or your children\'s results.'
      });
    }

    // Build query
    const whereClause = { studentId, isPublished: true };
    
    if (examId) {
      whereClause.examId = examId;
    }
    
    if (examType || year) {
      const examWhere = {};
      if (examType) examWhere.examType = examType;
      if (year) examWhere.examYear = year;
      
      const exams = await Exam.findAll({ where: examWhere });
      const examIds = exams.map(e => e.id);
      whereClause.examId = { [Op.in]: examIds };
    }

    const results = await StudentResult.findAll({
      where: whereClause,
      include: [
        {
          model: Exam,
          as: 'exam',
          attributes: ['id', 'examType', 'examYear', 'term', 'startDate', 'endDate']
        },
        {
          model: Student,
          as: 'student',
          include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
        }
      ],
      order: [[{ model: Exam, as: 'exam' }, 'examYear', 'DESC'], 
              [{ model: Exam, as: 'exam' }, 'startDate', 'DESC']]
    });

    // Calculate overall performance
    let totalObtained = 0;
    let totalMax = 0;
    let passedExams = 0;
    let failedExams = 0;

    results.forEach(result => {
      totalObtained += result.totalMarksObtained;
      totalMax += result.totalMaxMarks;
      if (result.status === 'Pass') {
        passedExams++;
      } else {
        failedExams++;
      }
    });

    const overallPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: student.user.name,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section,
          email: student.user.email
        },
        results,
        summary: {
          totalExams: results.length,
          passedExams,
          failedExams,
          totalMarksObtained: totalObtained,
          totalMaxMarks: totalMax,
          overallPercentage: overallPercentage.toFixed(2)
        }
      }
    });

  } catch (err) {
    console.error("Get Student Result Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch results"
    });
  }
};

// ============= ADD BULK RESULTS (Admin only) =============
const addBulkResults = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can add results'
      });
    }

    const { examId, results } = req.body;

    if (!examId || !results || !Array.isArray(results)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: examId, results (array)'
      });
    }

    const exam = await Exam.findByPk(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        error: 'Exam not found'
      });
    }

    const createdResults = [];
    const errors = [];

    for (const resultData of results) {
      try {
        const { studentId, subjects, rank, remarks } = resultData;

        // Check if student exists
        const student = await Student.findByPk(studentId);
        if (!student) {
          errors.push({ studentId, error: 'Student not found' });
          continue;
        }

        // Check if result already exists
        const existingResult = await StudentResult.findOne({
          where: { studentId, examId }
        });

        if (existingResult) {
          errors.push({ studentId, error: 'Result already exists' });
          continue;
        }

        // Create result
        const result = await StudentResult.create({
          studentId,
          examId,
          subjects,
          rank: rank || null,
          remarks: remarks || null,
          resultDate: new Date(),
          addedBy: req.user.id,
          isPublished: true
        }, { transaction });

        createdResults.push(result);
      } catch (err) {
        errors.push({ studentId: resultData.studentId, error: err.message });
      }
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: {
        created: createdResults,
        errors: errors,
        totalCreated: createdResults.length,
        totalErrors: errors.length
      },
      message: `${createdResults.length} results added successfully`
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

// ============= UPDATE STUDENT RESULT (Admin only) =============
const updateStudentResult = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can update results'
      });
    }

    const { id } = req.params;
    const { subjects, rank, remarks, isPublished } = req.body;

    const result = await StudentResult.findByPk(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Result not found'
      });
    }

    const updateData = {};
    if (subjects) updateData.subjects = subjects;
    if (rank !== undefined) updateData.rank = rank;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    await result.update(updateData, { transaction });

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
      error: "Failed to update result"
    });
  }
};

// ============= GET ALL RESULTS FOR CLASS (Admin/Teacher) =============
const getClassResults = async (req, res) => {
  try {
    const { class: className, section, examId } = req.query;

    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only admin and teachers can view class results.'
      });
    }

    if (!className || !examId) {
      return res.status(400).json({
        success: false,
        error: 'Class and Exam ID are required'
      });
    }

    // Get all students in the class
    const students = await Student.findAll({
      where: { class: className, section },
      include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
    });

    // Get results for these students
    const studentIds = students.map(s => s.id);
    const results = await StudentResult.findAll({
      where: {
        studentId: { [Op.in]: studentIds },
        examId,
        isPublished: true
      },
      include: [{ model: Exam, as: 'exam' }]
    });

    // Combine data
    const resultData = students.map(student => {
      const studentResult = results.find(r => r.studentId === student.id);
      return {
        studentId: student.id,
        rollNumber: student.rollNumber,
        studentName: student.user.name,
        totalMarks: studentResult ? studentResult.totalMarksObtained : null,
        percentage: studentResult ? studentResult.percentage : null,
        status: studentResult ? studentResult.status : 'Not Available',
        division: studentResult ? studentResult.division : 'N/A',
        rank: studentResult ? studentResult.rank : null
      };
    });

    // Sort by percentage for ranking
    resultData.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

    // Assign ranks
    let rank = 1;
    for (let i = 0; i < resultData.length; i++) {
      if (i > 0 && resultData[i].percentage === resultData[i-1].percentage) {
        resultData[i].rank = resultData[i-1].rank;
      } else {
        resultData[i].rank = rank;
      }
      rank++;
    }

    const exam = await Exam.findByPk(examId);

    res.json({
      success: true,
      data: {
        exam: {
          id: exam.id,
          examType: exam.examType,
          examYear: exam.examYear,
          term: exam.term
        },
        class: className,
        section: section || 'All',
        totalStudents: students.length,
        results: resultData
      }
    });

  } catch (err) {
    console.error("Get Class Results Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch class results"
    });
  }
};

// ============= GET ALL EXAMS (Admin/Teacher/Student) =============
const getAllExams = async (req, res) => {
  try {
    const { examYear, examType } = req.query;

    const whereClause = {};
    if (examYear) whereClause.examYear = examYear;
    if (examType) whereClause.examType = examType;

    const exams = await Exam.findAll({
      where: whereClause,
      order: [['examYear', 'DESC'], ['startDate', 'DESC']],
      include: [{
        model: User,
        as: 'addedByUser',
        attributes: ['name', 'email']
      }]
    });

    res.json({
      success: true,
      data: exams
    });

  } catch (err) {
    console.error("Get All Exams Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch exams"
    });
  }
};

// ============= CREATE EXAM (Admin only) =============
const createExam = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can create exams'
      });
    }

    const { examType, examYear, term, startDate, endDate, description } = req.body;

    if (!examType || !examYear || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: examType, examYear, startDate, endDate'
      });
    }

    const exam = await Exam.create({
      examType,
      examYear,
      term,
      startDate,
      endDate,
      description,
      addedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: exam,
      message: 'Exam created successfully'
    });

  } catch (err) {
    console.error("Create Exam Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to create exam: " + err.message
    });
  }
};

// ============= DELETE RESULT (Admin only) =============
const deleteResult = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can delete results'
      });
    }

    const { id } = req.params;

    const result = await StudentResult.findByPk(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Result not found'
      });
    }

    await result.destroy();

    res.json({
      success: true,
      message: 'Result deleted successfully'
    });

  } catch (err) {
    console.error("Delete Result Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete result"
    });
  }
};

module.exports = {
  addStudentResult,
  addBulkResults,
  updateStudentResult,
  getStudentResult,
  getClassResults,
  getAllExams,
  createExam,
  deleteResult
};