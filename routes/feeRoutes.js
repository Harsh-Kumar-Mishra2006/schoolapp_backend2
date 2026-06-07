// routes/feeRoutes.js
const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
const authMiddleware = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// ============= ADMIN ONLY ROUTES =============
// Add fee for a student (supports studentId, school ID, or email)
router.post('/add',
  authMiddleware,
  authorize(['admin']),
  feeController.addFee
);

// Add payment to a fee record
router.post('/payment/:id',
  authMiddleware,
  authorize(['admin']),
  feeController.addPayment
);

// Update fee record
router.put('/update/:id',
  authMiddleware,
  authorize(['admin']),
  feeController.updateFeeRecord
);

// Delete fee record
router.delete('/delete/:id',
  authMiddleware,
  authorize(['admin']),
  feeController.deleteFeeRecord
);

// Get all fee records with filters
router.get('/all',
  authMiddleware,
  authorize(['admin']),
  feeController.getAllFeeRecords
);

// Get fee dashboard statistics
router.get('/dashboard',
  authMiddleware,
  authorize(['admin']),
  feeController.getFeeDashboard
);

// ============= STUDENT/PARENT ROUTES =============
// Get fee for a specific student (supports studentId or school ID)
router.get('/student/:studentId',
  authMiddleware,
  feeController.getStudentFee
);

module.exports = router;