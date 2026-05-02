const StudentResult = require('../models/StudentResult');
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const User = require('../models/User');
const Parent = require('../models/Parent');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

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

// ============= GET ALL EXAMS =============
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

// ============= ADD STUDENT RESULT BY EMAIL (Admin only) =============
const addStudentResultByEmail = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can add results'
      });
    }

    const {
      email,
      examId,
      subjects,
      rank,
      remarks,
      resultDate
    } = req.body;

    if (!email || !examId || !subjects || !Array.isArray(subjects)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, examId, subjects (array)'
      });
    }

    // Find student by email
    const user = await User.findOne({
      where: { email: email.toLowerCase(), role: 'student' }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Student not found with this email'
      });
    }

    const student = await Student.findOne({ 
      where: { userId: user.id }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found'
      });
    }

    const exam = await Exam.findByPk(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        error: 'Exam not found'
      });
    }

    // Check if result already exists
    const existingResult = await StudentResult.findOne({
      where: { studentId: student.id, examId }
    });

    if (existingResult) {
      return res.status(400).json({
        success: false,
        error: `Result for ${user.name} in ${exam.examType} already exists`
      });
    }

    // Create result with student details
    const result = await StudentResult.create({
      studentId: student.id,
      examId,
      studentName: user.name,
      studentEmail: user.email,
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
        studentName: result.studentName,
        studentClass: result.studentClass,
        studentSection: result.studentSection,
        examId: result.examId,
        totalMarksObtained: result.totalMarksObtained,
        totalMaxMarks: result.totalMaxMarks,
        percentage: result.percentage,
        status: result.status,
        division: result.division,
        rank: result.rank
      },
      message: `Result for ${user.name} added successfully`
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
      if (parent && parent.children && Array.isArray(parent.children) && parent.children.includes(studentId)) {
        isChildOfParent = true;
      }
    }

    if (!isStudent && !isChildOfParent && !isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Build query
    const whereClause = { studentId: student.id, isPublished: true };
    
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
      } else if (result.status === 'Fail') {
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

// ============= GET ALL RESULTS (Admin view) =============
const getAllResults = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const { examId, class: className, section, status } = req.query;

    const whereClause = {};
    if (examId) whereClause.examId = examId;
    if (className) whereClause.studentClass = className;
    if (section) whereClause.studentSection = section;
    if (status) whereClause.status = status;

    const results = await StudentResult.findAll({
      where: whereClause,
      include: [
        {
          model: Exam,
          as: 'exam',
          attributes: ['id', 'examType', 'examYear', 'term']
        }
      ],
      order: [['studentClass', 'ASC'], ['studentSection', 'ASC'], ['studentRollNumber', 'ASC']]
    });

    res.json({
      success: true,
      data: results,
      count: results.length
    });

  } catch (err) {
    console.error("Get All Results Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch results"
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

// ============= DELETE RESULT (Admin only) =============
const deleteResult = async (req, res) => {
  const transaction = await sequelize.transaction();
  
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
      error: "Failed to delete result"
    });
  }
};

// ============= GET CLASS RESULTS =============
const getClassResults = async (req, res) => {
  try {
    const { examId, class: className, section } = req.query;

    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (!examId || !className) {
      return res.status(400).json({
        success: false,
        error: 'Exam ID and Class are required'
      });
    }

    const whereClause = { examId, studentClass: className };
    if (section) whereClause.studentSection = section;

    const results = await StudentResult.findAll({
      where: whereClause,
      include: [{ model: Exam, as: 'exam' }],
      order: [['studentRollNumber', 'ASC']]
    });

    // Calculate ranks
    const sortedResults = [...results].sort((a, b) => b.percentage - a.percentage);
    let currentRank = 1;
    for (let i = 0; i < sortedResults.length; i++) {
      if (i > 0 && sortedResults[i].percentage === sortedResults[i-1].percentage) {
        sortedResults[i].rank = sortedResults[i-1].rank;
      } else {
        sortedResults[i].rank = currentRank;
      }
      currentRank++;
      
      // Update rank in database
      await sortedResults[i].update({ rank: sortedResults[i].rank });
    }

    res.json({
      success: true,
      data: results,
      count: results.length
    });

  } catch (err) {
    console.error("Get Class Results Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch class results"
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
        const { email, subjects, rank, remarks } = resultData;

        const user = await User.findOne({
          where: { email: email.toLowerCase(), role: 'student' }
        });

        if (!user) {
          errors.push({ email, error: 'Student not found' });
          continue;
        }

        const student = await Student.findOne({ where: { userId: user.id } });
        if (!student) {
          errors.push({ email, error: 'Student profile not found' });
          continue;
        }

        const existingResult = await StudentResult.findOne({
          where: { studentId: student.id, examId }
        });

        if (existingResult) {
          errors.push({ email, error: 'Result already exists' });
          continue;
        }

        const result = await StudentResult.create({
          studentId: student.id,
          examId,
          studentName: user.name,
          studentEmail: user.email,
          studentClass: student.class,
          studentSection: student.section,
          studentRollNumber: student.rollNumber,
          parentEmail: student.parentEmail || null,
          subjects,
          rank: rank || null,
          remarks: remarks || null,
          addedBy: req.user.id,
          isPublished: true
        }, { transaction });

        createdResults.push(result);
      } catch (err) {
        errors.push({ email: resultData.email, error: err.message });
      }
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: {
        created: createdResults.length,
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

module.exports = {
  createExam,
  getAllExams,
  addStudentResultByEmail,
  getStudentResult,
  getAllResults,
  updateStudentResult,
  deleteResult,
  getClassResults,
  addBulkResults
};