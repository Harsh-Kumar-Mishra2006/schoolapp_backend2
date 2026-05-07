// routes/attendanceRoutes.js
const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendenceController');
const authMiddleware = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// ============= VIEW ATTENDANCE ROUTES =============// Get student attendance - Works for: Student (self), Parent (child), Teacher, Admin
// Supports both School ID (STU001) and Database ID (1)
router.get('/student/:studentId', 
  authMiddleware, 
  attendanceController.getStudentAttendance
);

// Get parent's all children attendance - Parent only
router.get('/parent/children', 
  authMiddleware, 
  authorize(['parent']),
  attendanceController.getParentChildrenAttendance
);

// Get teacher attendance - Teacher (self) or Admin
router.get('/teacher/:teacherId', 
  authMiddleware, 
  attendanceController.getTeacherAttendance
);

// Get class attendance - Teacher or Admin
router.get('/class/:class/:section', 
  authMiddleware, 
  authorize(['admin', 'teacher']),
  attendanceController.getClassAttendance
);

// Get all students attendance overview - Teacher or Admin
router.get('/students/all', 
  authMiddleware, 
  authorize(['admin', 'teacher']),
  attendanceController.getAllStudentsAttendance
);

// Get attendance statistics for dashboard - Teacher or Admin
router.get('/statistics', 
  authMiddleware, 
  authorize(['admin', 'teacher']),
  attendanceController.getAttendanceStatistics
);

// ============= MARK ATTENDANCE ROUTES =============

// Mark single student attendance - Teacher or Admin
router.post('/student/mark', 
  authMiddleware, 
  authorize(['admin', 'teacher']),
  attendanceController.markStudentAttendance
);

// Bulk mark class attendance - Teacher or Admin
router.post('/student/bulk-mark', 
  authMiddleware, 
  authorize(['admin', 'teacher']),
  attendanceController.bulkMarkStudentAttendance
);

// Mark teacher attendance - Admin only
router.post('/teacher/mark', 
  authMiddleware, 
  authorize(['admin']),
  attendanceController.markTeacherAttendance
);

// ============= ADMIN ONLY ROUTES =============

// Reset monthly attendance (can be called by cron job or admin)
router.post('/reset-monthly', 
  authMiddleware, 
  authorize(['admin']),
  attendanceController.resetMonthlyAttendance
);

module.exports = router;