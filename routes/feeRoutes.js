const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
const authMiddleware = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// ============= ADMIN ONLY ROUTES =============
router.post('/add', 
  authMiddleware, 
  authorize(['admin']), 
  feeController.addFeeRecord
);

router.put('/update/:id', 
  authMiddleware, 
  authorize(['admin']), 
  feeController.updateFeeRecord
);

router.post('/record-payment', 
  authMiddleware, 
  authorize(['admin']), 
  feeController.recordPayment
);

router.get('/pending/all', 
  authMiddleware, 
  authorize(['admin']), 
  feeController.getAllPendingFees
);

router.get('/at-risk', 
  authMiddleware, 
  authorize(['admin']), 
  feeController.getStudentsAtRisk
);

router.post('/suspend', 
  authMiddleware, 
  authorize(['admin']), 
  feeController.suspendStudent
);

// ============= STUDENT/PARENT/ADMIN ROUTES =============
router.get('/student/:studentId', 
  authMiddleware, 
  feeController.getStudentFeeDetails
);

router.get('/payment-history/:studentId', 
  authMiddleware, 
  feeController.getPaymentHistory
);

module.exports = router;