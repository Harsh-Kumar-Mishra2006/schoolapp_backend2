// routes/resultRoutes.js
const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');
const authMiddleware = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// ============= INITIALIZATION ROUTES =============
router.post('/initialize-exams',
  authMiddleware,
  authorize(['admin']),
  resultController.initializeExamsForYear
);

router.get('/exam-types',
  authMiddleware,
  resultController.getAvailableExamTypes
);

// ============= ADD RESULTS BY EXAM TYPE =============
router.post('/add-by-exam-type',
  authMiddleware,
  authorize(['admin']),
  resultController.addStudentResultByExamType
);

router.post('/add-bulk-by-class',
  authMiddleware,
  authorize(['admin']),
  resultController.addBulkResultsByClass
);

// ============= VIEW RESULTS =============
router.get('/student/:studentId',
  authMiddleware,
  resultController.getStudentResult
);

router.get('/class-performance',
  authMiddleware,
  authorize(['admin', 'teacher']),
  resultController.getClassPerformance
);

router.get('/class-results',
  authMiddleware,
  authorize(['admin', 'teacher']),
  resultController.getClassResults
);

router.get('/all',
  authMiddleware,
  authorize(['admin', 'teacher']),
  resultController.getAllResults
);

// ============= UPDATE/DELETE =============
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

// ============= EXAMS ROUTES =============
router.get('/exams',
  authMiddleware,
  resultController.getAllExams  // Make sure this function exists
);

module.exports = router;