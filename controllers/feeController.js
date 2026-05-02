const Fee = require('../models/Fee');
const Student = require('../models/Student');
const User = require('../models/User');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

// ============= ADMIN: ADD FEE FOR STUDENT BY EMAIL =============
const addFeeByEmail = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can add fee records'
      });
    }

    const {
      email,
      currentMonth,
      currentYear,
      pendingFrom,
      pendingFromYear,
      monthsPending,
      monthlyFee,
      transportFee,
      examFee,
      tuitionFee,
      lateFee,
      totalAmount,
      amountInWords,
      dueDate,
      remarks
    } = req.body;

    // Validation
    if (!email || !currentMonth || !currentYear || !totalAmount || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, currentMonth, currentYear, totalAmount, dueDate'
      });
    }

    // Find student by email
    const user = await User.findOne({
      where: { email: email.toLowerCase(), role: 'student' }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Student not found with this email'
      });
    }

    const student = await Student.findOne({ 
      where: { userId: user.id }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found'
      });
    }

    // Check if fee already exists for this student and month/year
    const existingFee = await Fee.findOne({
      where: {
        studentId: student.id,
        currentMonth: currentMonth,
        currentYear: currentYear
      }
    });

    if (existingFee) {
      return res.status(400).json({
        success: false,
        error: `Fee record for ${currentMonth} ${currentYear} already exists`
      });
    }

    // Calculate total if not provided
    let calculatedTotal = totalAmount;
    if (!calculatedTotal) {
      calculatedTotal = (parseFloat(monthlyFee) || 0) + 
                        (parseFloat(transportFee) || 0) + 
                        (parseFloat(examFee) || 0) + 
                        (parseFloat(tuitionFee) || 0) + 
                        (parseFloat(lateFee) || 0);
    }

    const fee = await Fee.create({
      studentId: student.id,
      currentMonth: currentMonth,
      currentYear: currentYear,
      pendingFrom: pendingFrom || currentMonth,
      pendingFromYear: pendingFromYear || currentYear,
      monthsPending: monthsPending || 1,
      monthlyFee: monthlyFee || 0,
      transportFee: transportFee || 0,
      examFee: examFee || 0,
      tuitionFee: tuitionFee || 0,
      lateFee: lateFee || 0,
      totalAmount: calculatedTotal,
      amountInWords: amountInWords || '',
      status: 'Pending',
      dueDate: dueDate,
      remarks: remarks || null,
      addedBy: req.user.id,
      isPublished: true
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: {
        fee: {
          id: fee.id,
          studentId: fee.studentId,
          currentMonth: fee.currentMonth,
          currentYear: fee.currentYear,
          totalAmount: fee.totalAmount,
          dueDate: fee.dueDate,
          status: fee.status
        }
      },
      message: `Fee record added successfully for ${user.name}`
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Add Fee Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to add fee record: " + err.message
    });
  }
};

// ============= UPDATE FEE PAYMENT =============
const updateFeePayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { lastPaymentAmount, lastPaymentDate, status, totalPaid, balanceAmount } = req.body;

    const fee = await Fee.findByPk(id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        error: 'Fee record not found'
      });
    }

    const newTotalPaid = (fee.totalPaid || 0) + (lastPaymentAmount || 0);
    const newBalanceAmount = (fee.totalAmount || 0) - newTotalPaid;
    let newStatus = status;

    if (!newStatus) {
      if (newBalanceAmount <= 0) {
        newStatus = 'Paid';
      } else if (newTotalPaid > 0) {
        newStatus = 'Partially Paid';
      } else {
        newStatus = 'Pending';
      }
    }

    await fee.update({
      lastPaymentAmount: lastPaymentAmount || fee.lastPaymentAmount,
      lastPaymentDate: lastPaymentDate || new Date(),
      status: newStatus,
      totalPaid: newTotalPaid,
      balanceAmount: newBalanceAmount,
      updatedBy: req.user.id
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      data: fee,
      message: 'Payment updated successfully'
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Update Fee Payment Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update payment"
    });
  }
};

// ============= GET STUDENT FEE (Student/Parent view) =============
const getStudentFee = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status, year } = req.query;

    const requestingUser = req.user;
    const student = await Student.findByPk(studentId, {
      include: [{ model: User, as: 'user' }]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Authorization check
    const isStudent = requestingUser.role === 'student' && requestingUser.id === student.userId;
    const isParent = requestingUser.role === 'parent';
    const isAdmin = requestingUser.role === 'admin';

    if (!isStudent && !isParent && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const whereClause = { studentId: student.id };
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    if (year) {
      whereClause.currentYear = year;
    }

    const fees = await Fee.findAll({
      where: whereClause,
      order: [['currentYear', 'DESC'], ['createdAt', 'DESC']]
    });

    // Summary
    const summary = {
      total_fees: 0,
      total_paid: 0,
      total_due: 0,
      pending_count: 0,
      paid_count: 0,
      overdue_count: 0
    };

    fees.forEach(fee => {
      const totalAmount = parseFloat(fee.totalAmount) || 0;
      const totalPaid = parseFloat(fee.totalPaid) || 0;
      summary.total_fees += totalAmount;
      summary.total_paid += totalPaid;
      summary.total_due += (totalAmount - totalPaid);
      
      if (fee.status === 'Paid') summary.paid_count++;
      else if (fee.status === 'Pending') summary.pending_count++;
      else if (fee.status === 'Overdue') summary.overdue_count++;
    });

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: student.user.name,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section
        },
        fees,
        summary
      }
    });

  } catch (err) {
    console.error("Get Student Fee Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch fee records"
    });
  }
};

// ============= GET ALL FEE RECORDS (Admin view) =============
const getAllFeeRecords = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const { status, year, month } = req.query;

    const whereClause = {};
    if (status && status !== 'all') whereClause.status = status;
    if (year) whereClause.currentYear = parseInt(year);
    if (month) whereClause.currentMonth = month;

    const fees = await Fee.findAll({
      where: whereClause,
      include: [{ model: Student, as: 'student', include: [{ model: User, as: 'user' }] }],
      order: [['currentYear', 'DESC'], ['createdAt', 'DESC']]
    });

    const feesWithDetails = fees.map(fee => ({
      id: fee.id,
      studentName: fee.student?.user?.name || 'N/A',
      studentEmail: fee.student?.user?.email || 'N/A',
      class: fee.student?.class || 'N/A',
      section: fee.student?.section || 'N/A',
      rollNumber: fee.student?.rollNumber || 'N/A',
      currentMonth: fee.currentMonth,
      currentYear: fee.currentYear,
      totalAmount: fee.totalAmount,
      totalPaid: fee.totalPaid || 0,
      balanceAmount: fee.balanceAmount || (fee.totalAmount - (fee.totalPaid || 0)),
      status: fee.status,
      dueDate: fee.dueDate,
      lastPaymentDate: fee.lastPaymentDate,
      lastPaymentAmount: fee.lastPaymentAmount,
      remarks: fee.remarks
    }));

    res.json({
      success: true,
      data: feesWithDetails,
      count: fees.length
    });

  } catch (err) {
    console.error("Get All Fee Records Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch fee records"
    });
  }
};

// ============= DELETE FEE RECORD =============
const deleteFeeRecord = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can delete fee records'
      });
    }

    const { id } = req.params;
    const fee = await Fee.findByPk(id);
    
    if (!fee) {
      return res.status(404).json({
        success: false,
        error: 'Fee record not found'
      });
    }

    await fee.destroy({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: 'Fee record deleted successfully'
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Delete Fee Record Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete fee record"
    });
  }
};

// ============= GET FEE SUMMARY DASHBOARD =============
const getFeeDashboard = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const currentYear = new Date().getFullYear();
    
    const statusSummary = await Fee.findAll({
      where: { currentYear: currentYear },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'total_amount'],
        [sequelize.fn('SUM', sequelize.col('totalPaid')), 'total_paid']
      ],
      group: ['status']
    });

    res.json({
      success: true,
      data: {
        status_summary: statusSummary,
        current_year: currentYear
      }
    });

  } catch (err) {
    console.error("Get Fee Dashboard Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch dashboard data"
    });
  }
};

module.exports = {
  addFeeByEmail,
  updateFeePayment,
  getStudentFee,
  getAllFeeRecords,
  deleteFeeRecord,
  getFeeDashboard
};
