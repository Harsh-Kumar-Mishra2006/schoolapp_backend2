const Student = require('../models/Student');
const User = require('../models/User');

/**
 * Get complete student data by student ID (school ID or DB ID)
 * This eliminates email lookups everywhere
 */
const getStudentByIdentifier = async (identifier) => {
  const student = await Student.findOne({
    where: {
      [Op.or]: [
        { studentId: identifier },
        { id: isNaN(identifier) ? 0 : identifier }
      ]
    },
    include: [{ model: User, as: 'user' }]
  });
  
  if (!student) return null;
  
  return {
    id: student.id,
    studentId: student.studentId,
    name: student.user.name,
    email: student.user.email,
    phone: student.user.phone,
    class: student.class,
    section: student.section,
    rollNumber: student.rollNumber,
    parentEmail: student.parentEmail,
    fatherName: student.fatherName,
    motherName: student.motherName,
    userData: student.user
  };
};

module.exports = { getStudentByIdentifier };