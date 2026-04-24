const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// ============= PUBLIC ROUTES =============
router.post('/admin/signup', authController.adminSignup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/verify', authController.verifyToken);

// ============= PROTECTED ROUTES (All authenticated users) =============
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/change-password', authMiddleware, authController.changePassword);
router.post('/logout', authMiddleware, authController.logout);

// ============= ADMIN ONLY ROUTES =============
router.post('/add-teacher', authMiddleware, authorize(['admin']), authController.addTeacher);
router.post('/add-student', authMiddleware, authorize(['admin']), authController.addStudent);
router.post('/add-parent', authMiddleware, authorize(['admin']), authController.addParent);
router.get('/users', authMiddleware, authorize(['admin']), authController.getAllUsers);
router.get('/users/:id', authMiddleware, authorize(['admin']), authController.getUserById);
router.put('/users/:id', authMiddleware, authorize(['admin']), authController.updateUser);
router.delete('/users/:id', authMiddleware, authorize(['admin']), authController.deleteUser);

module.exports = router;