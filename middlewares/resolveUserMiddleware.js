// middlewares/resolveUserMiddleware.js - COMPLETE VERSION
const { Student, Teacher, Parent } = require('../models');

/**
 * Convert Student ID → Student Email + Parent Email
 */
const resolveStudentById = async (req, res, next) => {
  try {
    const { studentId } = req.body;
    
    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID is required'
      });
    }
    
    const student = await Student.findOne({
      where: { studentId: studentId },
      include: ['user']
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: `Student not found with ID: ${studentId}`
      });
    }
    
    req.resolvedStudent = {
      id: student.id,
      studentId: student.studentId,
      email: student.user.email,
      parentEmail: student.parentEmail,
      name: student.user.name,
      class: student.class,
      section: student.section,
      rollNumber: student.rollNumber,
      userId: student.userId
    };
    
    next();
  } catch (err) {
    console.error("Resolve Student Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to resolve student ID"
    });
  }
};

/**
 * Convert Teacher ID → Teacher Email (FOR DATA ADDITION)
 */
const resolveTeacherById = async (req, res, next) => {
  try {
    const { teacherId } = req.body;
    
    if (!teacherId) {
      return res.status(400).json({
        success: false,
        error: 'Teacher ID is required'
      });
    }
    
    const teacher = await Teacher.findOne({
      where: { teacherId: teacherId },
      include: ['user']
    });
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: `Teacher not found with ID: ${teacherId}`
      });
    }
    
    req.resolvedTeacher = {
      id: teacher.id,
      teacherId: teacher.teacherId,
      email: teacher.user.email,
      name: teacher.user.name,
      userId: teacher.userId,
      phone: teacher.user.phone,
      qualification: teacher.qualification,
      specialization: teacher.specialization
    };
    
    next();
  } catch (err) {
    console.error("Resolve Teacher Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to resolve teacher ID"
    });
  }
};

/**
 * Convert Teacher ID and Student ID together (for assigning teacher to student)
 */
const resolveTeacherAndStudent = async (req, res, next) => {
  try {
    const { teacherId, studentId } = req.body;
    
    if (!teacherId || !studentId) {
      return res.status(400).json({
        success: false,
        error: 'Both Teacher ID and Student ID are required'
      });
    }
    
    // Resolve teacher
    const teacher = await Teacher.findOne({
      where: { teacherId: teacherId },
      include: ['user']
    });
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: `Teacher not found with ID: ${teacherId}`
      });
    }
    
    // Resolve student
    const student = await Student.findOne({
      where: { studentId: studentId },
      include: ['user']
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: `Student not found with ID: ${studentId}`
      });
    }
    
    req.resolvedTeacher = {
      id: teacher.id,
      teacherId: teacher.teacherId,
      email: teacher.user.email,
      name: teacher.user.name,
      userId: teacher.userId
    };
    
    req.resolvedStudent = {
      id: student.id,
      studentId: student.studentId,
      email: student.user.email,
      parentEmail: student.parentEmail,
      name: student.user.name,
      class: student.class,
      section: student.section,
      rollNumber: student.rollNumber,
      userId: student.userId
    };
    
    next();
  } catch (err) {
    console.error("Resolve Teacher & Student Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to resolve IDs"
    });
  }
};

/**
 * Convert Roll Number + Class → Student
 */
const resolveStudentByRollNo = async (req, res, next) => {
  try {
    const { rollNumber, className, section } = req.body;
    
    if (!rollNumber || !className) {
      return res.status(400).json({
        success: false,
        error: 'Roll number and class are required'
      });
    }
    
    const student = await Student.findOne({
      where: { 
        rollNumber: rollNumber,
        class: className,
        section: section || null
      },
      include: ['user']
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: `Student not found with Roll No: ${rollNumber} in Class: ${className}`
      });
    }
    
    req.resolvedStudent = {
      id: student.id,
      studentId: student.studentId,
      email: student.user.email,
      parentEmail: student.parentEmail,
      name: student.user.name,
      class: student.class,
      section: student.section,
      rollNumber: student.rollNumber,
      userId: student.userId
    };
    
    next();
  } catch (err) {
    console.error("Resolve Student by Roll No Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to resolve student"
    });
  }
};

module.exports = {
  resolveStudentById,
  resolveTeacherById,
  resolveTeacherAndStudent,
  resolveStudentByRollNo
};