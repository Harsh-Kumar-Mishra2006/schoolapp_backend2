const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// ============= ADMIN ONLY ROUTES =============
router.post('/student/add', 
  authMiddleware, 
  authorize(['admin']), 
  attendanceController.addStudentAttendance
);

router.post('/teacher/add', 
  authMiddleware, 
  authorize(['admin']), 
  attendanceController.addTeacherAttendance
);

router.put('/student/update/:id', 
  authMiddleware, 
  authorize(['admin']), 
  attendanceController.updateStudentAttendance
);

router.put('/teacher/update/:id', 
  authMiddleware, 
  authorize(['admin']), 
  attendanceController.updateTeacherAttendance
);

// ============= ADMIN & TEACHER ROUTES =============
router.get('/students/all', 
  authMiddleware, 
  authorize(['admin', 'teacher']), 
  attendanceController.getAllStudentsAttendance
);

router.post('/daily/mark', 
  authMiddleware, 
  authorize(['admin', 'teacher']), 
  attendanceController.markDailyAttendance
);

router.get('/daily/class', 
  authMiddleware, 
  authorize(['admin', 'teacher']), 
  attendanceController.getDailyClassAttendance
);

// ============= STUDENT/PARENT/TEACHER ROUTES (self view) =============
router.get('/student/:studentId', 
  authMiddleware, 
  attendanceController.getStudentAttendance
);

router.get('/teacher/:teacherId', 
  authMiddleware, 
  attendanceController.getTeacherAttendance
);

module.exports = router;