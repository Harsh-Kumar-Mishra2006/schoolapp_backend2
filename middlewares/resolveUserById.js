const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');

/**
 * Middleware to resolve student ID to full student data with user info
 * This eliminates the need to use email for lookups
 */
const resolveStudentById = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { student_id } = req.body; // For POST requests
    
    const idToUse = studentId || student_id;
    
    if (!idToUse) {
      req.resolvedStudent = null;
      return next();
    }
    
    // Find student by their student_id (school ID) or database ID
    const student = await Student.findOne({
      where: {
        [Op.or]: [
          { studentId: idToUse },      // School ID like STU001
          { id: isNaN(idToUse) ? 0 : idToUse }  // Database ID
        ]
      },
      include: [{ model: User, as: 'user' }]
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: `Student not found with identifier: ${idToUse}`
      });
    }
    
    // Attach full student data to request
    req.resolvedStudent = {
      id: student.id,
      studentId: student.studentId,
      rollNumber: student.rollNumber,
      class: student.class,
      section: student.section,
      name: student.user.name,
      email: student.user.email,
      phone: student.user.phone,
      parentEmail: student.parentEmail,
      fatherName: student.fatherName,
      motherName: student.motherName,
      userData: student.user
    };
    
    next();
  } catch (err) {
    console.error("Resolve Student Error:", err);
    res.status(500).json({
      success: false,
      error: "Error resolving student data"
    });
  }
};

/**
 * Middleware to resolve teacher ID to full teacher data with user info
 */
const resolveTeacherById = async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    const { teacher_id } = req.body;
    
    const idToUse = teacherId || teacher_id;
    
    if (!idToUse) {
      req.resolvedTeacher = null;
      return next();
    }
    
    const teacher = await Teacher.findOne({
      where: {
        [Op.or]: [
          { teacherId: idToUse },      // School ID like TCH001
          { id: isNaN(idToUse) ? 0 : idToUse }
        ]
      },
      include: [{ model: User, as: 'user' }]
    });
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: `Teacher not found with identifier: ${idToUse}`
      });
    }
    
    req.resolvedTeacher = {
      id: teacher.id,
      teacherId: teacher.teacherId,
      name: teacher.user.name,
      email: teacher.user.email,
      phone: teacher.user.phone,
      qualification: teacher.qualification,
      specialization: teacher.specialization,
      userData: teacher.user
    };
    
    next();
  } catch (err) {
    console.error("Resolve Teacher Error:", err);
    res.status(500).json({
      success: false,
      error: "Error resolving teacher data"
    });
  }
};

/**
 * Middleware to auto-populate student data in request body
 * Useful for adding attendance, fees, results etc.
 */
const populateStudentData = async (req, res, next) => {
  try {
    const { studentId } = req.body;
    
    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: "studentId is required"
      });
    }
    
    const student = await Student.findOne({
      where: {
        [Op.or]: [
          { studentId: studentId },
          { id: isNaN(studentId) ? 0 : studentId }
        ]
      },
      include: [{ model: User, as: 'user' }]
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: `Student not found with ID: ${studentId}`
      });
    }
    
    // Auto-populate request body with student data
    req.body.student_id = student.id;
    req.body.name = student.user.name;
    req.body.email = student.user.email;
    req.body.class = student.class;
    req.body.roll_number = student.rollNumber;
    req.body.section = student.section;
    req.body.parent_email = student.parentEmail;
    
    next();
  } catch (err) {
    console.error("Populate Student Error:", err);
    res.status(500).json({
      success: false,
      error: "Error populating student data"
    });
  }
};

/**
 * Middleware to auto-populate teacher data in request body
 */
const populateTeacherData = async (req, res, next) => {
  try {
    const { teacherId } = req.body;
    
    if (!teacherId) {
      return res.status(400).json({
        success: false,
        error: "teacherId is required"
      });
    }
    
    const teacher = await Teacher.findOne({
      where: {
        [Op.or]: [
          { teacherId: teacherId },
          { id: isNaN(teacherId) ? 0 : teacherId }
        ]
      },
      include: [{ model: User, as: 'user' }]
    });
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: `Teacher not found with ID: ${teacherId}`
      });
    }
    
    // Auto-populate request body with teacher data
    req.body.teacher_id = teacher.id;
    req.body.name = teacher.user.name;
    req.body.email = teacher.user.email;
    req.body.teacher_school_id = teacher.teacherId;
    
    next();
  } catch (err) {
    console.error("Populate Teacher Error:", err);
    res.status(500).json({
      success: false,
      error: "Error populating teacher data"
    });
  }
};

module.exports = {
  resolveStudentById,
  resolveTeacherById,
  populateStudentData,
  populateTeacherData
};