const StudentAttendance = require('../models/StudentAttendance');
const TeacherAttendance = require('../models/TeacherAttendance');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

// ============= ADD STUDENT ATTENDANCE (Admin only) =============
const addStudentAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
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

    if (!studentId || !month || !year || totalWorkingDays === undefined || daysPresent === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, month, year, totalWorkingDays, daysPresent'
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

    const existingAttendance = await StudentAttendance.findOne({
      where: {
        student_id: studentId,
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

    const attendance = await StudentAttendance.create({
      student_id: studentId,
      name: student.user.name,
      email: student.user.email,
      class: student.class,
      roll_number: student.rollNumber,
      section: student.section,
      parent_email: student.parentEmail || null,
      month,
      year,
      total_working_days: totalWorkingDays,
      days_present: daysPresent,
      remark: remark || null,
      added_by: req.user.id
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

    const teacher = await Teacher.findByPk(teacherId, {
      include: [{ model: User, as: 'user' }]
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found'
      });
    }

    const existingAttendance = await TeacherAttendance.findOne({
      where: {
        teacher_id: teacherId,
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
      teacher_id: teacherId,
      name: teacher.user.name,
      email: teacher.user.email,
      teacher_school_id: teacher.teacherId,
      month,
      year,
      total_working_days: totalWorkingDays,
      days_present: daysPresent,
      remark: remark || null,
      added_by: req.user.id
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
      total_working_days: totalWorkingDays || attendance.total_working_days,
      days_present: daysPresent || attendance.days_present,
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
      total_working_days: totalWorkingDays || attendance.total_working_days,
      days_present: daysPresent || attendance.days_present,
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

// ============= GET STUDENT ATTENDANCE =============
const getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { month, year } = req.query;

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

    const isStudent = requestingUser.role === 'student' && requestingUser.id === student.userId;
    const isParent = requestingUser.role === 'parent';
    const isTeacher = requestingUser.role === 'teacher';
    const isAdmin = requestingUser.role === 'admin';

    if (!isStudent && !isParent && !isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own attendance.'
      });
    }

    const whereClause = { student_id: studentId };
    if (month) whereClause.month = month;
    if (year) whereClause.year = year;

    const attendance = await StudentAttendance.findAll({
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
      summary.totalWorkingDays += record.total_working_days;
      summary.totalPresent += record.days_present;
      summary.totalAbsent += record.days_absent;
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

// ============= GET TEACHER ATTENDANCE =============
const getTeacherAttendance = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { month, year } = req.query;

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

    const whereClause = { teacher_id: teacherId };
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
      summary.totalWorkingDays += record.total_working_days;
      summary.totalPresent += record.days_present;
      summary.totalAbsent += record.days_absent;
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

// ============= GET ALL STUDENTS ATTENDANCE =============
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
      order: [
        ['class', 'ASC'],
        ['section', 'ASC'],
        ['roll_number', 'ASC'],
        ['year', 'DESC'],
        [sequelize.literal(`FIELD(month, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')`)]
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

module.exports = {
  addStudentAttendance,
  addTeacherAttendance,
  updateStudentAttendance,
  updateTeacherAttendance,
  getStudentAttendance,
  getTeacherAttendance,
  getAllStudentsAttendance
};