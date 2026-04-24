const StudentAttendance = require('../models/StudentAttendance');
const TeacherAttendance = require('../models/TeacherAttendance');
const DailyAttendance = require('../models/DailyAttendance');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

// ============= ADD STUDENT ATTENDANCE (Admin only) =============
const addStudentAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Check if admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can add attendance records'
      });
    }

    const {
      studentId,
      month,
      year,
      totalWorkingDays,
      daysPresent,
      remark
    } = req.body;

    // Validation
    if (!studentId || !month || !year || totalWorkingDays === undefined || daysPresent === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, month, year, totalWorkingDays, daysPresent'
      });
    }

    // Get student details
    const student = await Student.findByPk(studentId, {
      include: [{ model: User, as: 'user' }]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Check if attendance already exists for this month
    const existingAttendance = await StudentAttendance.findOne({
      where: {
        studentId,
        month,
        year
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: `Attendance for ${month} ${year} already exists. Use update endpoint instead.`
      });
    }

    // Create attendance record
    const attendance = await StudentAttendance.create({
      studentId,
      name: student.user.name,
      email: student.user.email,
      class: student.class,
      rollNumber: student.rollNumber,
      section: student.section,
      parentEmail: student.parentEmail || null,
      month,
      year,
      totalWorkingDays,
      daysPresent,
      remark: remark || null,
      addedBy: req.user.id
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: attendance,
      message: `Student attendance for ${month} ${year} added successfully`
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Add Student Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to add student attendance: " + err.message
    });
  }
};

// ============= ADD TEACHER ATTENDANCE (Admin only) =============
const addTeacherAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can add attendance records'
      });
    }

    const {
      teacherId,
      month,
      year,
      totalWorkingDays,
      daysPresent,
      remark
    } = req.body;

    if (!teacherId || !month || !year || totalWorkingDays === undefined || daysPresent === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: teacherId, month, year, totalWorkingDays, daysPresent'
      });
    }

    // Get teacher details
    const teacher = await Teacher.findByPk(teacherId, {
      include: [{ model: User, as: 'user' }]
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found'
      });
    }

    // Check existing
    const existingAttendance = await TeacherAttendance.findOne({
      where: {
        teacherId,
        month,
        year
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: `Attendance for ${month} ${year} already exists`
      });
    }

    const attendance = await TeacherAttendance.create({
      teacherId,
      name: teacher.user.name,
      email: teacher.user.email,
      teacherSchoolId: teacher.teacherId,
      month,
      year,
      totalWorkingDays,
      daysPresent,
      remark: remark || null,
      addedBy: req.user.id
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: attendance,
      message: `Teacher attendance for ${month} ${year} added successfully`
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Add Teacher Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to add teacher attendance: " + err.message
    });
  }
};

// ============= UPDATE STUDENT ATTENDANCE (Admin only) =============
const updateStudentAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can update attendance records'
      });
    }

    const { id } = req.params;
    const { totalWorkingDays, daysPresent, remark } = req.body;

    const attendance = await StudentAttendance.findByPk(id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found'
      });
    }

    await attendance.update({
      totalWorkingDays: totalWorkingDays || attendance.totalWorkingDays,
      daysPresent: daysPresent || attendance.daysPresent,
      remark: remark || attendance.remark
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      data: attendance,
      message: 'Student attendance updated successfully'
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Update Student Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update student attendance"
    });
  }
};

// ============= UPDATE TEACHER ATTENDANCE (Admin only) =============
const updateTeacherAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can update attendance records'
      });
    }

    const { id } = req.params;
    const { totalWorkingDays, daysPresent, remark } = req.body;

    const attendance = await TeacherAttendance.findByPk(id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found'
      });
    }

    await attendance.update({
      totalWorkingDays: totalWorkingDays || attendance.totalWorkingDays,
      daysPresent: daysPresent || attendance.daysPresent,
      remark: remark || attendance.remark
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      data: attendance,
      message: 'Teacher attendance updated successfully'
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Update Teacher Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update teacher attendance"
    });
  }
};

// ============= GET STUDENT ATTENDANCE (Student/Parent/Teacher authorized) =============
const getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { month, year } = req.query;

    // Authorization check
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

    // Check permissions
    const isStudent = requestingUser.role === 'student' && requestingUser.id === student.userId;
    const isParent = requestingUser.role === 'parent'; // Parent check will need additional logic
    const isTeacher = requestingUser.role === 'teacher';
    const isAdmin = requestingUser.role === 'admin';

    if (!isStudent && !isParent && !isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own attendance.'
      });
    }

    // Build query
    const whereClause = { studentId };
    if (month) whereClause.month = month;
    if (year) whereClause.year = year;

    const attendance = await StudentAttendance.findAll({
      where: whereClause,
      order: [['year', 'DESC'], 
              [sequelize.literal(`FIELD(month, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')`)]]
    });

    // Calculate summary
    const summary = {
      totalWorkingDays: 0,
      totalPresent: 0,
      totalAbsent: 0,
      overallPercentage: 0
    };

    attendance.forEach(record => {
      summary.totalWorkingDays += record.totalWorkingDays;
      summary.totalPresent += record.daysPresent;
      summary.totalAbsent += record.daysAbsent;
    });

    if (summary.totalWorkingDays > 0) {
      summary.overallPercentage = (summary.totalPresent / summary.totalWorkingDays) * 100;
      summary.overallPercentage = parseFloat(summary.overallPercentage.toFixed(2));
    }

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: student.user.name,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section
        },
        attendance,
        summary
      }
    });

  } catch (err) {
    console.error("Get Student Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch student attendance"
    });
  }
};

// ============= GET TEACHER ATTENDANCE (Teacher authorized) =============
const getTeacherAttendance = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { month, year } = req.query;

    // Authorization
    const requestingUser = req.user;
    const teacher = await Teacher.findByPk(teacherId, {
      include: [{ model: User, as: 'user' }]
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found'
      });
    }

    const isTeacher = requestingUser.role === 'teacher' && requestingUser.id === teacher.userId;
    const isAdmin = requestingUser.role === 'admin';

    if (!isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Teachers can only view their own attendance.'
      });
    }

    const whereClause = { teacherId };
    if (month) whereClause.month = month;
    if (year) whereClause.year = year;

    const attendance = await TeacherAttendance.findAll({
      where: whereClause,
      order: [['year', 'DESC'], 
              [sequelize.literal(`FIELD(month, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')`)]]
    });

    const summary = {
      totalWorkingDays: 0,
      totalPresent: 0,
      totalAbsent: 0,
      overallPercentage: 0
    };

    attendance.forEach(record => {
      summary.totalWorkingDays += record.totalWorkingDays;
      summary.totalPresent += record.daysPresent;
      summary.totalAbsent += record.daysAbsent;
    });

    if (summary.totalWorkingDays > 0) {
      summary.overallPercentage = (summary.totalPresent / summary.totalWorkingDays) * 100;
      summary.overallPercentage = parseFloat(summary.overallPercentage.toFixed(2));
    }

    res.json({
      success: true,
      data: {
        teacher: {
          id: teacher.id,
          name: teacher.user.name,
          teacherId: teacher.teacherId
        },
        attendance,
        summary
      }
    });

  } catch (err) {
    console.error("Get Teacher Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch teacher attendance"
    });
  }
};

// ============= GET ALL STUDENTS ATTENDANCE (Admin/Teacher) =============
const getAllStudentsAttendance = async (req, res) => {
  try {
    const { class: className, section, month, year } = req.query;

    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only admin and teachers can view all students attendance.'
      });
    }

    const whereClause = {};
    if (className) whereClause.class = className;
    if (section) whereClause.section = section;
    if (month) whereClause.month = month;
    if (year) whereClause.year = year;

    const attendance = await StudentAttendance.findAll({
      where: whereClause,
      include: [{
        model: Student,
        as: 'student',
        attributes: ['rollNumber', 'class', 'section']
      }],
      order: [
        ['class', 'ASC'],
        ['section', 'ASC'],
        ['rollNumber', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: attendance,
      count: attendance.length
    });

  } catch (err) {
    console.error("Get All Students Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch attendance records"
    });
  }
};

// ============= MARK DAILY ATTENDANCE (Teacher/Admin) =============
const markDailyAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { entityType, entityId, date, status, checkInTime, checkOutTime, remark } = req.body;

    if (!entityType || !entityId || !date || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: entityType, entityId, date, status'
      });
    }

    if (!['student', 'teacher'].includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: 'entityType must be either "student" or "teacher"'
      });
    }

    // Check if attendance already marked for this day
    let attendance = await DailyAttendance.findOne({
      where: {
        entityType,
        entityId,
        date
      }
    });

    if (attendance) {
      // Update existing
      await attendance.update({
        status,
        checkInTime,
        checkOutTime,
        remark,
        markedBy: req.user.id
      }, { transaction });
    } else {
      // Create new
      attendance = await DailyAttendance.create({
        entityType,
        entityId,
        date,
        status,
        checkInTime,
        checkOutTime,
        remark,
        markedBy: req.user.id
      }, { transaction });
    }

    await transaction.commit();

    res.json({
      success: true,
      data: attendance,
      message: 'Daily attendance marked successfully'
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Mark Daily Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to mark daily attendance"
    });
  }
};

// ============= GET DAILY ATTENDANCE FOR CLASS =============
const getDailyClassAttendance = async (req, res) => {
  try {
    const { class: className, section, date } = req.query;

    if (!className || !date) {
      return res.status(400).json({
        success: false,
        error: 'Class and date are required'
      });
    }

    // Get all students in the class
    const students = await Student.findAll({
      where: { class: className, section },
      include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
    });

    // Get attendance for these students on the given date
    const studentIds = students.map(s => s.id);
    const dailyAttendance = await DailyAttendance.findAll({
      where: {
        entityType: 'student',
        entityId: studentIds,
        date
      }
    });

    // Combine data
    const attendanceData = students.map(student => {
      const studentAttendance = dailyAttendance.find(a => a.entityId === student.id);
      return {
        studentId: student.id,
        rollNumber: student.rollNumber,
        studentName: student.user.name,
        status: studentAttendance ? studentAttendance.status : 'not-marked',
        checkInTime: studentAttendance ? studentAttendance.checkInTime : null,
        checkOutTime: studentAttendance ? studentAttendance.checkOutTime : null,
        remark: studentAttendance ? studentAttendance.remark : null
      };
    });

    res.json({
      success: true,
      data: {
        date,
        class: className,
        section: section || 'All',
        totalStudents: students.length,
        marked: dailyAttendance.length,
        notMarked: students.length - dailyAttendance.length,
        attendance: attendanceData
      }
    });

  } catch (err) {
    console.error("Get Daily Class Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch daily attendance"
    });
  }
};

module.exports = {
  addStudentAttendance,
  addTeacherAttendance,
  updateStudentAttendance,
  updateTeacherAttendance,
  getStudentAttendance,
  getTeacherAttendance,
  getAllStudentsAttendance,
  markDailyAttendance,
  getDailyClassAttendance
};