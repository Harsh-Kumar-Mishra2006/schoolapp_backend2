const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Parent = require('../models/Parent');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'Harsh2006@';

// ============= ADMIN SIGNUP (Direct, No Approval) =============
const adminSignup = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { name, email, username, phone, password } = req.body;

    // Validation
    if (!name || !email || !password || !username || !phone) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'Email or username already registered' 
      });
    }

    const adminUser = await User.create({
      name,
      email,
      username,
      phone,
      password,
      role: 'admin',
      isEmailApproved: true,
      isActive: true,
      needsPasswordChange: false // Admin doesn't need to change password on first login
    }, { transaction });

    await transaction.commit();

    const token = adminUser.generateAuthToken();

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          username: adminUser.username,
          phone: adminUser.phone,
          role: adminUser.role
        }
      },
      message: 'Admin account created successfully!'
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Admin Signup Error:", err);
    res.status(400).json({
      success: false,
      error: "Failed to create admin account: " + err.message
    });
  }
};

// ============= ADMIN: ADD TEACHER =============
const addTeacher = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can add teachers'
      });
    }

    const {
      name, email, username, phone,
      teacherId, qualification, specialization, experience, address
    } = req.body;

    if (!name || !email || !username || !phone || !teacherId) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, username, phone, and teacherId are required'
      });
    }

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email or username already exists'
      });
    }

    const generatedPassword = User.generateRandomPassword();

    const teacherUser = await User.create({
      name,
      email,
      username,
      phone,
      password: generatedPassword,
      tempPassword: generatedPassword, // ← ADD THIS LINE
      role: 'teacher',
      isEmailApproved: true,
      isActive: true,
      addedBy: req.user.id,
      needsPasswordChange: true
    }, { transaction });

    const teacher = await Teacher.create({
      userId: teacherUser.id,
      teacherId,
      qualification,
      specialization,
      experience,
      address
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: teacherUser.id,
          name: teacherUser.name,
          email: teacherUser.email,
          username: teacherUser.username,
          phone: teacherUser.phone,
          role: teacherUser.role
        },
        teacher,
        temporaryPassword: generatedPassword
      },
      message: `Teacher ${name} added successfully! Temporary password: ${generatedPassword}`
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Add Teacher Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to add teacher: " + err.message
    });
  }
};
// ============= ADMIN: ADD STUDENT =============
const addStudent = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can add students'
      });
    }

    const {
      name, email, username, phone,
      studentId, rollNumber, class: className, section,
      fatherName, motherName, address, dateOfBirth, gender, bloodGroup
    } = req.body;

    if (!name || !email || !username || !phone || !studentId || !rollNumber || !className || !section) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email or username already exists'
      });
    }

    const generatedPassword = User.generateRandomPassword();

    const studentUser = await User.create({
      name,
      email,
      username,
      phone,
      password: generatedPassword,
      tempPassword: generatedPassword, // ← ADD THIS LINE
      role: 'student',
      isEmailApproved: true,
      isActive: true,
      addedBy: req.user.id,
      needsPasswordChange: true
    }, { transaction });

    const student = await Student.create({
      userId: studentUser.id,
      studentId,
      rollNumber,
      class: className,
      section,
      fatherName,
      motherName,
      address,
      dateOfBirth,
      gender,
      bloodGroup
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: studentUser.id,
          name: studentUser.name,
          email: studentUser.email,
          username: studentUser.username,
          phone: studentUser.phone,
          role: studentUser.role
        },
        student,
        temporaryPassword: generatedPassword
      },
      message: `Student ${name} added successfully! Temporary password: ${generatedPassword}`
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Add Student Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to add student: " + err.message
    });
  }
};
// ============= ADMIN: ADD PARENT =============
const addParent = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can add parents'
      });
    }

    const {
      name, email, username, phone,
      occupation, address, children
    } = req.body;

    if (!name || !email || !username || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, username, and phone are required'
      });
    }

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email or username already exists'
      });
    }

    const generatedPassword = User.generateRandomPassword();

    const parentUser = await User.create({
      name,
      email,
      username,
      phone,
      password: generatedPassword,
      tempPassword: generatedPassword, // ← ADD THIS LINE
      role: 'parent',
      isEmailApproved: true,
      isActive: true,
      addedBy: req.user.id,
      needsPasswordChange: true
    }, { transaction });

    const parent = await Parent.create({
      userId: parentUser.id,
      occupation,
      address,
      children: children || []
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: parentUser.id,
          name: parentUser.name,
          email: parentUser.email,
          username: parentUser.username,
          phone: parentUser.phone,
          role: parentUser.role
        },
        parent,
        temporaryPassword: generatedPassword
      },
      message: `Parent ${name} added successfully! Temporary password: ${generatedPassword}`
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Add Parent Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to add parent: " + err.message
    });
  }
};

// ============= LOGIN (For all users) =============
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase() },
          { username: email.toLowerCase() }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact administrator.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    await user.update({
      lastLogin: new Date(),
      loginCount: user.loginCount + 1
    });

    const token = user.generateAuthToken();

    // Fetch additional profile data based on role
    let profileData = {};
    if (user.role === 'student') {
      const student = await Student.findOne({ where: { userId: user.id } });
      if (student) profileData.student = student;
    } else if (user.role === 'teacher') {
      const teacher = await Teacher.findOne({ where: { userId: user.id } });
      if (teacher) profileData.teacher = teacher;
    } else if (user.role === 'parent') {
      const parent = await Parent.findOne({ where: { userId: user.id } });
      if (parent) profileData.parent = parent;
    }

    res.json({
      success: true,
      data: {
        token,
        needsPasswordChange: user.needsPasswordChange,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          phone: user.phone,
          ...profileData
        }
      },
      message: `Welcome back, ${user.name}!`,
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({
      success: false,
      error: "Server error during login"
    });
  }
};

// ============= CHANGE PASSWORD (First login or voluntarily) =============
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters'
      });
    }

    const user = await User.findByPk(userId);
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password and clear temp password
    user.password = newPassword;
    user.tempPassword = null; // ← ADD THIS LINE
    user.needsPasswordChange = false;
    await user.save();

    const token = user.generateAuthToken();

    res.json({
      success: true,
      data: { token },
      message: 'Password changed successfully'
    });

  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to change password"
    });
  }
};

// ============= FORGOT PASSWORD =============
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Save reset token
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // TODO: Send email with reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    res.json({
      success: true,
      message: 'Password reset instructions sent to your email',
      data: process.env.NODE_ENV === 'development' ? { resetLink, resetToken } : {}
    });

  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to process request"
    });
  }
};

// ============= RESET PASSWORD =============
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset token'
      });
    }

    const user = await User.findOne({
      where: {
        id: decoded.userId,
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.needsPasswordChange = false;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to reset password"
    });
  }
};

// ============= VERIFY TOKEN =============
const verifyToken = async (req, res) => {
  try {
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        needsPasswordChange: user.needsPasswordChange,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role
        }
      }
    });

  } catch (err) {
    console.error("Verify Token Error:", err);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// ============= GET ALL USERS (Admin only) =============
const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }

    const { role } = req.query;
    const whereClause = {};
    
    if (role && role !== 'all') {
      whereClause.role = role;
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] },
      include: [
        { model: Student, as: 'student', required: false },
        { model: Teacher, as: 'teacher', required: false },
        { model: Parent, as: 'parent', required: false }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Add temporary password for users who need password change
    const usersWithTempPass = users.map(user => {
      const userObj = user.toJSON();
      if (user.needsPasswordChange && user.tempPassword) {
        userObj.temporaryPassword = user.tempPassword;
      }
      return userObj;
    });

    res.json({
      success: true,
      data: usersWithTempPass
    });

  } catch (err) {
    console.error("Get All Users Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch users"
    });
  }
};

// ============= GET USER BY ID =============
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Users can only view their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] },
      include: [
        { model: Student, as: 'student', required: false },
        { model: Teacher, as: 'teacher', required: false },
        { model: Parent, as: 'parent', required: false }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (err) {
    console.error("Get User Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user"
    });
  }
};

// ============= UPDATE USER (Admin only) =============
const updateUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can update users'
      });
    }

    const { id } = req.params;
    const { name, email, username, phone, isActive } = req.body;

    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    await user.update({
      name: name || user.name,
      email: email || user.email,
      username: username || user.username,
      phone: phone || user.phone,
      isActive: isActive !== undefined ? isActive : user.isActive
    });

    res.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });

  } catch (err) {
    console.error("Update User Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update user"
    });
  }
};

// ============= DELETE USER (Admin only) =============
const deleteUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can delete users'
      });
    }

    const { id } = req.params;

    // Don't allow admin to delete themselves
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete associated profile based on role
    if (user.role === 'student') {
      await Student.destroy({ where: { userId: id }, transaction });
    } else if (user.role === 'teacher') {
      await Teacher.destroy({ where: { userId: id }, transaction });
    } else if (user.role === 'parent') {
      await Parent.destroy({ where: { userId: id }, transaction });
    }

    // Delete user
    await user.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Delete User Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete user"
    });
  }
};

// ============= GET PROFILE =============
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] },
      include: [
        { model: Student, as: 'student', required: false },
        { model: Teacher, as: 'teacher', required: false },
        { model: Parent, as: 'parent', required: false }
      ]
    });

    res.json({
      success: true,
      data: user
    });

  } catch (err) {
    console.error("Get Profile Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile"
    });
  }
};

// ============= UPDATE PROFILE =============
const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    await user.update({
      name: name || user.name,
      phone: phone || user.phone
    });

    res.json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });

  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update profile"
    });
  }
};

// ============= LOGOUT =============
const logout = async (req, res) => {
  res.json({
    success: true,
    message: "Logged out successfully"
  });
};

module.exports = {
  adminSignup,
  addTeacher,
  addStudent,
  addParent,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyToken,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getProfile,
  updateProfile,
  logout
};