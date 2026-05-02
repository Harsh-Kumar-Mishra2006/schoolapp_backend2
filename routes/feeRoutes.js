const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
const authMiddleware = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// ============= ADMIN ONLY ROUTES =============
router.post('/add-by-email', 
  authMiddleware, 
  authorize(['admin']), 
  feeController.addFeeByEmail
);


router.put('/payment/:id', 
  authMiddleware, 
  authorize(['admin']), 
  feeController.updateFeePayment
);

router.delete('/:id', 
  authMiddleware, 
  authorize(['admin']), 
  feeController.deleteFeeRecord
);

router.get('/dashboard', 
  authMiddleware, 
  authorize(['admin']), 
  feeController.getFeeDashboard
);

// ============= ADMIN & TEACHER ROUTES =============
router.get('/all', 
  authMiddleware, 
  authorize(['admin', 'teacher']), 
  feeController.getAllFeeRecords
);

// ============= STUDENT/PARENT ROUTES =============
router.get('/student/:studentId', 
  authMiddleware, 
  feeController.getStudentFee
);

module.exports = router;