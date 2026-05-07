// controllers/attendenceController.js
const StudentAttendance = require('../models/studentAttedance');
const TeacherAttendance = require('../models/TeacherAttendance');
const DailyStudentAttendance = require('../models/DailyStudentAttendance');
const DailyTeacherAttendance = require('../models/DailyTeacherAttendance');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

// ============= HELPER FUNCTION: Resolve Student by ID (School ID or DB ID) =============
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

// ============= HELPER FUNCTION: Resolve Teacher by ID =============
const resolveTeacherByIdentifier = async (identifier, transaction = null) => {
  let teacher = null;
  
  if (!isNaN(identifier) && identifier.toString().trim() !== '') {
    teacher = await Teacher.findByPk(parseInt(identifier), {
      include: [{ model: User, as: 'user' }],
      transaction
    });
  }
  
  if (!teacher) {
    teacher = await Teacher.findOne({
      where: { teacherId: identifier.toString() },
      include: [{ model: User, as: 'user' }],
      transaction
    });
  }
  
  return teacher;
};

// ============= MARK STUDENT ATTENDANCE (Teacher/Admin) =============
const markStudentAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Only teachers and admin can mark attendance'
      });
    }

    const { studentId, date, status, remark, checkInTime, checkOutTime } = req.body;

    if (!studentId || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, status'
      });
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];
    
    // Resolve student by ID (supports both "STU001" and 1)
    const student = await resolveStudentByIdentifier(studentId, transaction);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: `Student not found with ID: ${studentId}`
      });
    }

    // Check if attendance already marked for this date
    let dailyAttendance = await DailyStudentAttendance.findOne({
      where: {
        student_id: student.id,
        date: attendanceDate
      },
      transaction
    });

    if (dailyAttendance) {
      await dailyAttendance.update({
        status,
        check_in_time: checkInTime || dailyAttendance.check_in_time,
        check_out_time: checkOutTime || dailyAttendance.check_out_time,
        remark: remark || dailyAttendance.remark,
        marked_by: req.user.id
      }, { transaction });
    } else {
      dailyAttendance = await DailyStudentAttendance.create({
        student_id: student.id,
        date: attendanceDate,
        status,
        check_in_time: checkInTime || null,
        check_out_time: checkOutTime || null,
        remark: remark || null,
        marked_by: req.user.id
      }, { transaction });
    }

    // Recalculate monthly attendance
    const month = new Date(attendanceDate).toLocaleString('default', { month: 'long' });
    const year = new Date(attendanceDate).getFullYear();
    
    const monthlyAttendance = await StudentAttendance.recalculateFromDaily(
      student.id, 
      month, 
      year, 
      transaction
    );

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student.studentId,
          name: student.user.name,
          class: student.class,
          section: student.section
        },
        daily: dailyAttendance,
        monthly: monthlyAttendance
      },
      message: `Attendance marked as ${status} for ${attendanceDate}`
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Mark Student Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to mark attendance: " + err.message
    });
  }
};

// ============= MARK TEACHER ATTENDANCE (Admin only) =============
const markTeacherAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can mark teacher attendance'
      });
    }

    const { teacherId, date, status, remark, checkInTime, checkOutTime } = req.body;

    if (!teacherId || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: teacherId, status'
      });
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];
    
    const teacher = await resolveTeacherByIdentifier(teacherId, transaction);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: `Teacher not found with ID: ${teacherId}`
      });
    }

    let dailyAttendance = await DailyTeacherAttendance.findOne({
      where: {
        teacher_id: teacher.id,
        date: attendanceDate
      },
      transaction
    });

    if (dailyAttendance) {
      await dailyAttendance.update({
        status,
        check_in_time: checkInTime || dailyAttendance.check_in_time,
        check_out_time: checkOutTime || dailyAttendance.check_out_time,
        remark: remark || dailyAttendance.remark,
        marked_by: req.user.id
      }, { transaction });
    } else {
      dailyAttendance = await DailyTeacherAttendance.create({
        teacher_id: teacher.id,
        date: attendanceDate,
        status,
        check_in_time: checkInTime || null,
        check_out_time: checkOutTime || null,
        remark: remark || null,
        marked_by: req.user.id
      }, { transaction });
    }

    const month = new Date(attendanceDate).toLocaleString('default', { month: 'long' });
    const year = new Date(attendanceDate).getFullYear();
    
    const monthlyAttendance = await TeacherAttendance.recalculateFromDaily(
      teacher.id, 
      month, 
      year, 
      transaction
    );

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: {
        teacher: {
          id: teacher.teacherId,
          name: teacher.user.name
        },
        daily: dailyAttendance,
        monthly: monthlyAttendance
      },
      message: `Teacher attendance marked as ${status} for ${attendanceDate}`
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Mark Teacher Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to mark teacher attendance: " + err.message
    });
  }
};

// ============= BULK MARK STUDENT ATTENDANCE =============
const bulkMarkStudentAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Only teachers and admin can mark attendance'
      });
    }

    const { class: className, section, date, attendanceList } = req.body;

    if (!className || !section || !attendanceList || !Array.isArray(attendanceList)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: class, section, attendanceList'
      });
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];
    const results = [];

    for (const item of attendanceList) {
      const { studentId, status, remark } = item;
      
      const student = await resolveStudentByIdentifier(studentId, transaction);
      if (!student) {
        console.warn(`Student not found: ${studentId}`);
        continue;
      }
      
      let dailyAttendance = await DailyStudentAttendance.findOne({
        where: {
          student_id: student.id,
          date: attendanceDate
        },
        transaction
      });

      if (dailyAttendance) {
        await dailyAttendance.update({
          status,
          remark: remark || dailyAttendance.remark,
          marked_by: req.user.id
        }, { transaction });
      } else {
        dailyAttendance = await DailyStudentAttendance.create({
          student_id: student.id,
          date: attendanceDate,
          status,
          remark: remark || null,
          marked_by: req.user.id
        }, { transaction });
      }

      results.push(dailyAttendance);
    }

    // Recalculate monthly for all students in class
    const month = new Date(attendanceDate).toLocaleString('default', { month: 'long' });
    const year = new Date(attendanceDate).getFullYear();
    
    const students = await Student.findAll({
      where: { class: className, section: section },
      transaction
    });

    for (const student of students) {
      await StudentAttendance.recalculateFromDaily(student.id, month, year, transaction);
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      data: {
        marked: results.length,
        date: attendanceDate,
        class: className,
        section: section
      },
      message: `Bulk attendance marked for ${results.length} students`
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Bulk Mark Student Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to mark bulk attendance: " + err.message
    });
  }
};

// ============= GET STUDENT ATTENDANCE (FIXED - Full view for students, parents, teachers, admin) =============
const getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { month, year } = req.query;
    const requestingUser = req.user;

    // Resolve student by ID (supports both "STU001" and 1)
    const student = await resolveStudentByIdentifier(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: `Student not found with ID: ${studentId}`
      });
    }

    // ============= AUTHORIZATION CHECK =============
    let isAuthorized = false;
    
    // Case 1: Student viewing their own attendance
    if (requestingUser.role === 'student' && requestingUser.id === student.userId) {
      isAuthorized = true;
    }
    
    // Case 2: Parent viewing their child's attendance
    if (requestingUser.role === 'parent') {
      const parent = await User.findByPk(requestingUser.id);
      if (parent && parent.email === student.parentEmail) {
        isAuthorized = true;
      }
    }
    
    // Case 3: Teacher viewing attendance
    if (requestingUser.role === 'teacher') {
      isAuthorized = true;
    }
    
    // Case 4: Admin
    if (requestingUser.role === 'admin') {
      isAuthorized = true;
    }
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own or your child\'s attendance.'
      });
    }

    // ============= FETCH ATTENDANCE DATA =============
    const whereClause = { student_id: student.id };
    if (month) whereClause.month = month;
    if (year) whereClause.year = year;

    // Get monthly attendance records
    const monthlyAttendance = await StudentAttendance.findAll({
      where: whereClause,
      order: [['year', 'DESC'], 
              [sequelize.literal(`FIELD(month, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')`)]]
    });

    // Get daily attendance
    let dailyWhereClause = { student_id: student.id };
    if (month && year) {
      const monthIndex = new Date(Date.parse(month + " 1, " + year)).getMonth();
      const startDate = new Date(year, monthIndex, 1);
      const endDate = new Date(year, monthIndex + 1, 0);
      dailyWhereClause.date = { [Op.between]: [startDate, endDate] };
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dailyWhereClause.date = { [Op.gte]: thirtyDaysAgo };
    }

    const dailyAttendance = await DailyStudentAttendance.findAll({
      where: dailyWhereClause,
      order: [['date', 'DESC']],
      limit: month ? undefined : 30
    });

    // Calculate summary
    const summary = {
      totalWorkingDays: 0,
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0,
      totalHalfDay: 0,
      overallPercentage: 0
    };

    monthlyAttendance.forEach(record => {
      summary.totalWorkingDays += record.total_working_days;
      summary.totalPresent += record.days_present;
      summary.totalAbsent += record.days_absent;
      summary.totalLate += record.days_late || 0;
      summary.totalHalfDay += record.days_half_day || 0;
    });

    if (summary.totalWorkingDays > 0) {
      summary.overallPercentage = (summary.totalPresent / summary.totalWorkingDays) * 100;
      summary.overallPercentage = parseFloat(summary.overallPercentage.toFixed(2));
    }

    // Get current month statistics
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    const currentYear = currentDate.getFullYear();
    const currentMonthData = monthlyAttendance.find(
      m => m.month === currentMonth && m.year === currentYear
    );

    res.json({
      success: true,
      data: {
        student: {
          id: student.studentId,
          databaseId: student.id,
          name: student.user.name,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section,
          parentEmail: student.parentEmail
        },
        current_month: currentMonthData ? {
          month: currentMonth,
          year: currentYear,
          present: currentMonthData.days_present,
          total: currentMonthData.total_working_days,
          percentage: currentMonthData.percentage,
          late: currentMonthData.days_late,
          halfDay: currentMonthData.days_half_day,
          absent: currentMonthData.days_absent
        } : null,
        monthly_records: monthlyAttendance,
        recent_daily_attendance: dailyAttendance,
        summary,
        viewer_role: requestingUser.role,
        relationship: requestingUser.role === 'parent' ? 'child' : 'self'
      }
    });

  } catch (err) {
    console.error("Get Student Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch student attendance: " + err.message
    });
  }
};

// ============= GET PARENT'S ALL CHILDREN ATTENDANCE =============
const getParentChildrenAttendance = async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: 'Only parents can access this endpoint'
      });
    }

    const parent = await User.findByPk(req.user.id);
    
    if (!parent) {
      return res.status(404).json({
        success: false,
        error: 'Parent not found'
      });
    }

    // Find all students with this parent's email
    const students = await Student.findAll({
      where: {
        parentEmail: parent.email
      },
      include: [{ model: User, as: 'user' }]
    });

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No students linked to your email address'
      });
    }

    const { month, year } = req.query;
    const childrenData = [];

    for (const student of students) {
      const whereClause = { student_id: student.id };
      if (month) whereClause.month = month;
      if (year) whereClause.year = year;

      const monthlyAttendance = await StudentAttendance.findAll({
        where: whereClause,
        order: [['year', 'DESC'], 
                [sequelize.literal(`FIELD(month, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')`)]]
      });

      // Get daily attendance for last 15 days
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      
      const dailyAttendance = await DailyStudentAttendance.findAll({
        where: {
          student_id: student.id,
          date: { [Op.gte]: fifteenDaysAgo }
        },
        order: [['date', 'DESC']]
      });

      const summary = {
        totalWorkingDays: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        totalHalfDay: 0,
        overallPercentage: 0
      };

      monthlyAttendance.forEach(record => {
        summary.totalWorkingDays += record.total_working_days;
        summary.totalPresent += record.days_present;
        summary.totalAbsent += record.days_absent;
        summary.totalLate += record.days_late || 0;
        summary.totalHalfDay += record.days_half_day || 0;
      });

      if (summary.totalWorkingDays > 0) {
        summary.overallPercentage = (summary.totalPresent / summary.totalWorkingDays) * 100;
        summary.overallPercentage = parseFloat(summary.overallPercentage.toFixed(2));
      }

      childrenData.push({
        student: {
          id: student.studentId,
          name: student.user.name,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section
        },
        monthly_attendance: monthlyAttendance,
        recent_attendance: dailyAttendance,
        summary
      });
    }

    res.json({
      success: true,
      data: {
        parent: {
          name: parent.name,
          email: parent.email
        },
        children: childrenData,
        total_children: students.length
      }
    });

  } catch (err) {
    console.error("Get Parent Children Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch children attendance: " + err.message
    });
  }
};

// ============= GET TEACHER ATTENDANCE =============
const getTeacherAttendance = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { month, year } = req.query;
    const requestingUser = req.user;

    const teacher = await resolveTeacherByIdentifier(teacherId);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: `Teacher not found with ID: ${teacherId}`
      });
    }

    // Authorization
    const isTeacher = requestingUser.role === 'teacher' && requestingUser.id === teacher.userId;
    const isAdmin = requestingUser.role === 'admin';

    if (!isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Teachers can only view their own attendance.'
      });
    }

    const whereClause = { teacher_id: teacher.id };
    if (month) whereClause.month = month;
    if (year) whereClause.year = year;

    const monthlyAttendance = await TeacherAttendance.findAll({
      where: whereClause,
      order: [['year', 'DESC'], 
              [sequelize.literal(`FIELD(month, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')`)]]
    });

    // Get daily attendance
    let dailyWhereClause = { teacher_id: teacher.id };
    if (month && year) {
      const monthIndex = new Date(Date.parse(month + " 1, " + year)).getMonth();
      const startDate = new Date(year, monthIndex, 1);
      const endDate = new Date(year, monthIndex + 1, 0);
      dailyWhereClause.date = { [Op.between]: [startDate, endDate] };
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dailyWhereClause.date = { [Op.gte]: thirtyDaysAgo };
    }

    const dailyAttendance = await DailyTeacherAttendance.findAll({
      where: dailyWhereClause,
      order: [['date', 'DESC']]
    });

    const summary = {
      totalWorkingDays: 0,
      totalPresent: 0,
      totalAbsent: 0,
      overallPercentage: 0
    };

    monthlyAttendance.forEach(record => {
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
          id: teacher.teacherId,
          databaseId: teacher.id,
          name: teacher.user.name,
          email: teacher.user.email,
          qualification: teacher.qualification,
          specialization: teacher.specialization
        },
        monthly_attendance: monthlyAttendance,
        recent_daily_attendance: dailyAttendance,
        summary
      }
    });

  } catch (err) {
    console.error("Get Teacher Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch teacher attendance: " + err.message
    });
  }
};

// ============= GET CLASS ATTENDANCE (For Teachers & Admin) =============
const getClassAttendance = async (req, res) => {
  try {
    const { class: className, section } = req.params;
    const { month, year, date } = req.query;
    const requestingUser = req.user;

    if (requestingUser.role !== 'admin' && requestingUser.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Only teachers and admin can view class attendance'
      });
    }

    const students = await Student.findAll({
      where: { class: className, section: section },
      include: [{ model: User, as: 'user' }],
      order: [['rollNumber', 'ASC']]
    });

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No students found in class ${className}-${section}`
      });
    }

    const result = [];
    let presentToday = 0;
    let absentToday = 0;
    let lateToday = 0;
    let halfDayToday = 0;
    let notMarked = 0;

    for (const student of students) {
      let attendanceData = null;
      
      if (date) {
        attendanceData = await DailyStudentAttendance.findOne({
          where: {
            student_id: student.id,
            date: date
          }
        });
        
        if (attendanceData) {
          if (attendanceData.status === 'present') presentToday++;
          else if (attendanceData.status === 'absent') absentToday++;
          else if (attendanceData.status === 'late') lateToday++;
          else if (attendanceData.status === 'half-day') halfDayToday++;
        } else {
          notMarked++;
        }
        
        result.push({
          student: {
            id: student.studentId,
            name: student.user.name,
            rollNumber: student.rollNumber
          },
          attendance: attendanceData || { status: 'not_marked', date: date }
        });
      } else {
        const monthToUse = month || new Date().toLocaleString('default', { month: 'long' });
        const yearToUse = year || new Date().getFullYear();
        
        const monthlyData = await StudentAttendance.findOne({
          where: {
            student_id: student.id,
            month: monthToUse,
            year: yearToUse
          }
        });
        
        result.push({
          student: {
            id: student.studentId,
            name: student.user.name,
            rollNumber: student.rollNumber
          },
          attendance: monthlyData || {
            month: monthToUse,
            year: yearToUse,
            total_working_days: 0,
            days_present: 0,
            percentage: 0
          }
        });
      }
    }

    res.json({
      success: true,
      data: {
        class: `${className}-${section}`,
        date: date || `${month || 'Current'} ${year || ''}`,
        total_students: students.length,
        summary: date ? {
          present: presentToday,
          absent: absentToday,
          late: lateToday,
          halfDay: halfDayToday,
          notMarked: notMarked,
          attendance_percentage: students.length > 0 ? ((presentToday / students.length) * 100).toFixed(2) : 0
        } : null,
        students: result
      }
    });

  } catch (err) {
    console.error("Get Class Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch class attendance: " + err.message
    });
  }
};

// ============= GET ALL STUDENTS ATTENDANCE (Admin/Teacher overview) =============
const getAllStudentsAttendance = async (req, res) => {
  try {
    const { class: className, section, month, year, status } = req.query;
    const requestingUser = req.user;

    if (requestingUser.role !== 'admin' && requestingUser.role !== 'teacher') {
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

    let attendance = await StudentAttendance.findAll({
      where: whereClause,
      order: [
        ['class', 'ASC'],
        ['section', 'ASC'],
        ['roll_number', 'ASC'],
        ['year', 'DESC'],
        [sequelize.literal(`FIELD(month, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')`)]
      ]
    });

    // Apply status filter if provided
    if (status === 'low_attendance') {
      attendance = attendance.filter(a => a.percentage < 75);
    } else if (status === 'high_attendance') {
      attendance = attendance.filter(a => a.percentage >= 90);
    } else if (status === 'critical') {
      attendance = attendance.filter(a => a.percentage < 60);
    }

    const stats = {
      totalRecords: attendance.length,
      averageAttendance: 0,
      lowAttendanceCount: attendance.filter(a => a.percentage < 75).length,
      excellentAttendanceCount: attendance.filter(a => a.percentage >= 90).length,
      criticalAttendanceCount: attendance.filter(a => a.percentage < 60).length
    };

    if (attendance.length > 0) {
      const totalPercentage = attendance.reduce((sum, a) => sum + parseFloat(a.percentage), 0);
      stats.averageAttendance = parseFloat((totalPercentage / attendance.length).toFixed(2));
    }

    res.json({
      success: true,
      data: {
        filters: { class: className, section, month, year, status },
        statistics: stats,
        attendance_records: attendance,
        count: attendance.length
      }
    });

  } catch (err) {
    console.error("Get All Students Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch attendance records: " + err.message
    });
  }
};

// ============= AUTO RESET MONTHLY ATTENDANCE (Cron Job) =============
const resetMonthlyAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can reset attendance'
      });
    }

    const currentDate = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const nextMonthName = nextMonth.toLocaleString('default', { month: 'long' });
    const nextYear = nextMonth.getFullYear();

    const students = await Student.findAll({ 
      include: [{ model: User, as: 'user' }],
      transaction 
    });
    
    let createdCount = 0;

    for (const student of students) {
      const existing = await StudentAttendance.findOne({
        where: {
          student_id: student.id,
          month: nextMonthName,
          year: nextYear
        },
        transaction
      });

      if (!existing) {
        const lastMonth = await StudentAttendance.findOne({
          where: {
            student_id: student.id,
            year: currentDate.getFullYear()
          },
          order: [['year', 'DESC'], ['id', 'DESC']],
          transaction
        });

        await StudentAttendance.create({
          student_id: student.id,
          name: student.user?.name || '',
          email: student.user?.email || '',
          class: student.class,
          roll_number: student.rollNumber,
          section: student.section,
          parent_email: student.parentEmail,
          month: nextMonthName,
          year: nextYear,
          total_working_days: 0,
          days_present: 0,
          days_absent: 0,
          days_late: 0,
          days_half_day: 0,
          percentage: 0,
          semester_total_present: lastMonth?.semester_total_present || 0,
          semester_total_days: lastMonth?.semester_total_days || 0,
          added_by: req.user?.id || 1
        }, { transaction });
        createdCount++;
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `Monthly attendance reset for ${nextMonthName} ${nextYear}`,
      data: { month: nextMonthName, year: nextYear, records_created: createdCount }
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Reset Monthly Attendance Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to reset attendance: " + err.message
    });
  }
};

// ============= GET ATTENDANCE STATISTICS (Dashboard) =============
const getAttendanceStatistics = async (req, res) => {
  try {
    const { class: className, section, month, year } = req.query;
    const requestingUser = req.user;

    if (requestingUser.role !== 'admin' && requestingUser.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const monthToUse = month || new Date().toLocaleString('default', { month: 'long' });
    const yearToUse = year || new Date().getFullYear();

    const whereClause = { month: monthToUse, year: yearToUse };
    if (className) whereClause.class = className;
    if (section) whereClause.section = section;

    const attendanceRecords = await StudentAttendance.findAll({
      where: whereClause
    });

    const totalStudents = attendanceRecords.length;
    const totalPresent = attendanceRecords.reduce((sum, r) => sum + r.days_present, 0);
    const totalWorkingDays = attendanceRecords.reduce((sum, r) => sum + r.total_working_days, 0);
    
    const above75 = attendanceRecords.filter(r => r.percentage >= 75).length;
    const below75 = attendanceRecords.filter(r => r.percentage < 75 && r.percentage >= 60).length;
    const below60 = attendanceRecords.filter(r => r.percentage < 60).length;

    res.json({
      success: true,
      data: {
        period: { month: monthToUse, year: yearToUse },
        summary: {
          total_students: totalStudents,
          total_present_days: totalPresent,
          total_working_days: totalWorkingDays,
          average_attendance: totalStudents > 0 ? parseFloat((totalPresent / totalWorkingDays * 100).toFixed(2)) : 0
        },
        categories: {
          above_75_percent: above75,
          below_75_percent: below75,
          below_60_percent: below60
        }
      }
    });

  } catch (err) {
    console.error("Get Attendance Statistics Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics"
    });
  }
};

module.exports = {
  // Mark attendance
  markStudentAttendance,
  markTeacherAttendance,
  bulkMarkStudentAttendance,
  
  // View attendance (FULLY FIXED)
  getStudentAttendance,
  getParentChildrenAttendance,
  getTeacherAttendance,
  getClassAttendance,
  getAllStudentsAttendance,
  getAttendanceStatistics,
  
  // Admin functions
  resetMonthlyAttendance,
  
  // Deprecated (return 410 Gone)
  addStudentAttendanceByEmail: async (req, res) => {
    res.status(410).json({ error: 'Deprecated. Use markStudentAttendance instead' });
  },
  addTeacherAttendanceByEmail: async (req, res) => {
    res.status(410).json({ error: 'Deprecated. Use markTeacherAttendance instead' });
  },
  addStudentAttendance: async (req, res) => {
    res.status(410).json({ error: 'Deprecated. Use markStudentAttendance instead' });
  },
  addTeacherAttendance: async (req, res) => {
    res.status(410).json({ error: 'Deprecated. Use markTeacherAttendance instead' });
  },
  updateStudentAttendance: async (req, res) => {
    res.status(410).json({ error: 'Deprecated. Use markStudentAttendance instead' });
  },
  updateTeacherAttendance: async (req, res) => {
    res.status(410).json({ error: 'Deprecated. Use markTeacherAttendance instead' });
  },
  getStudentMonthlySummary: getStudentAttendance,
  getDailyStudentAttendance: async (req, res) => {
    res.status(410).json({ error: 'Deprecated. Use getStudentAttendance instead' });
  }
};