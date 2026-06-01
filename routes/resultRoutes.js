const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');
const authMiddleware = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// ============= ADMIN ONLY ROUTES =============
router.post('/create-exam', 
  authMiddleware, 
  authorize(['admin']), 
  resultController.createExam
);

// Add result by student ID
router.post('/add-by-id', 
  authMiddleware, 
  authorize(['admin']), 
  resultController.addStudentResultById
);

// Add bulk results (keep only one version)
router.post('/add-bulk', 
  authMiddleware, 
  authorize(['admin']), 
  resultController.addBulkResults  // Use the existing function
);

router.put('/update/:id', 
  authMiddleware, 
  authorize(['admin']), 
  resultController.updateStudentResult
);

router.delete('/delete/:id', 
  authMiddleware, 
  authorize(['admin']), 
  resultController.deleteResult
);

// ============= ADMIN & TEACHER ROUTES =============
router.get('/all', 
  authMiddleware, 
  authorize(['admin', 'teacher']), 
  resultController.getAllResults
);

router.get('/class-results', 
  authMiddleware, 
  authorize(['admin', 'teacher']), 
  resultController.getClassResults
);

// ============= ALL AUTHENTICATED USERS =============
router.get('/exams', 
  authMiddleware, 
  resultController.getAllExams
);

router.get('/student/:studentId', 
  authMiddleware, 
  resultController.getStudentResult
);

module.exports = router;