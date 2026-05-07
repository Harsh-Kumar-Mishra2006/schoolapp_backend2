const Student = require('../models/Student');
const User = require('../models/User');
const { Op } = require('sequelize');

/**
 * Middleware that automatically gives parents access to their children's data
 * When parent logs in, this finds all students with matching parentEmail
 */
const resolveParentStudents = async (req, res, next) => {
  try {
    // If user is parent, find all their linked students
    if (req.user.role === 'parent') {
      const parent = await User.findByPk(req.user.id);
      
      if (parent && parent.email) {
        // Find all students with this parent's email
        const students = await Student.findAll({
          where: {
            parentEmail: parent.email
          },
          include: [{ model: User, as: 'user' }]
        });
        
        // Attach to request for use in controllers
        req.parentStudents = students.map(s => ({
          id: s.id,
          studentId: s.studentId,
          name: s.user.name,
          class: s.class,
          section: s.section,
          rollNumber: s.rollNumber,
          email: s.user.email
        }));
        
        req.parentEmail = parent.email;
      }
    }
    
    next();
  } catch (err) {
    console.error("Resolve Parent Students Error:", err);
    next();
  }
};

/**
 * Check if a parent has access to a specific student
 */
const checkParentAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'parent') {
      const { studentId } = req.params;
      const parent = await User.findByPk(req.user.id);
      
      if (!parent) {
        return res.status(403).json({
          success: false,
          error: 'Parent not found'
        });
      }
      
      // Find the student and check if parentEmail matches
      const student = await Student.findOne({
        where: {
          [Op.or]: [
            { studentId: studentId },
            { id: isNaN(studentId) ? 0 : studentId }
          ]
        }
      });
      
      if (!student || student.parentEmail !== parent.email) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this student\'s data'
        });
      }
      
      req.accessedStudent = student;
    }
    
    next();
  } catch (err) {
    console.error("Check Parent Access Error:", err);
    res.status(500).json({
      success: false,
      error: "Error checking parent access"
    });
  }
};

module.exports = {
  resolveParentStudents,
  checkParentAccess
};