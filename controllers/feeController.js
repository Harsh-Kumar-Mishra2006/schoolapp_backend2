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
      feeMonthFrom,
      feeMonthTo,
      feeYear,
      particulars,
      dueDate,
      remarks
    } = req.body;

    // Validation
    if (!email || !feeMonthFrom || !feeMonthTo || !feeYear || !particulars || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, feeMonthFrom, feeMonthTo, feeYear, particulars, dueDate'
      });
    }

    // Validate month range (max 12 months)
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const fromIndex = months.indexOf(feeMonthFrom);
    const toIndex = months.indexOf(feeMonthTo);
    
    if (fromIndex === -1 || toIndex === -1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month names'
      });
    }
    
    const monthDifference = toIndex - fromIndex + 1;
    if (monthDifference > 12) {
      return res.status(400).json({
        success: false,
        error: 'Fee period cannot exceed 12 months. Contact admin for special approval.'
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
      where: { userId: user.id },
      include: [{ model: User, as: 'user' }]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found'
      });
    }

    // Check if fee already exists for this period
    const existingFee = await Fee.findOne({
      where: {
        student_id: student.id,
        fee_month_from: feeMonthFrom,
        fee_month_to: feeMonthTo,
        fee_year: feeYear
      }
    });

    if (existingFee) {
      return res.status(400).json({
        success: false,
        error: `Fee record for ${feeMonthFrom} to ${feeMonthTo} ${feeYear} already exists`
      });
    }

    // Calculate total amount from particulars
    let totalAmount = 0;
    if (Array.isArray(particulars)) {
      totalAmount = particulars.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    }

    const fee = await Fee.create({
      student_id: student.id,
      student_name: user.name,
      student_email: user.email,
      parent_email: student.parentEmail || null,
      class: student.class,
      roll_number: student.rollNumber,
      section: student.section,
      fee_month_from: feeMonthFrom,
      fee_month_to: feeMonthTo,
      fee_year: feeYear,
      particulars: JSON.stringify(particulars),
      total_amount: totalAmount,
      amount_paid: 0,
      balance_due: totalAmount,
      due_date: dueDate,
      remarks: remarks || null,
      added_by: req.user.id
    }, { transaction });

    await transaction.commit();

    // Prepare notification data
    const feeData = {
      id: fee.id,
      student_name: fee.student_name,
      class: fee.class,
      section: fee.section,
      fee_month_from: fee.fee_month_from,
      fee_month_to: fee.fee_month_to,
      fee_year: fee.fee_year,
      particulars: JSON.parse(fee.particulars),
      total_amount: fee.total_amount,
      due_date: fee.due_date,
      status: fee.status
    };

    res.status(201).json({
      success: true,
      data: {
        fee: feeData,
        message: `Fee record added successfully for ${user.name}`
      }
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

// ============= ADMIN: ADD FEE BY STUDENT ID =============
const addFeeByStudentId = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can add fee records'
      });
    }

    const {
      studentId,
      feeMonthFrom,
      feeMonthTo,
      feeYear,
      particulars,
      dueDate,
      remarks
    } = req.body;

    if (!studentId || !feeMonthFrom || !feeMonthTo || !feeYear || !particulars || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const student = await Student.findByPk(studentId, {
      include: [{ model: User, as: 'user' }]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Check existing fee
    const existingFee = await Fee.findOne({
      where: {
        student_id: studentId,
        fee_month_from: feeMonthFrom,
        fee_month_to: feeMonthTo,
        fee_year: feeYear
      }
    });

    if (existingFee) {
      return res.status(400).json({
        success: false,
        error: `Fee record already exists for this period`
      });
    }

    let totalAmount = 0;
    if (Array.isArray(particulars)) {
      totalAmount = particulars.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    }

    const fee = await Fee.create({
      student_id: studentId,
      student_name: student.user.name,
      student_email: student.user.email,
      parent_email: student.parentEmail || null,
      class: student.class,
      roll_number: student.rollNumber,
      section: student.section,
      fee_month_from: feeMonthFrom,
      fee_month_to: feeMonthTo,
      fee_year: feeYear,
      particulars: JSON.stringify(particulars),
      total_amount: totalAmount,
      amount_paid: 0,
      balance_due: totalAmount,
      due_date: dueDate,
      remarks: remarks || null,
      added_by: req.user.id
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: fee,
      message: `Fee record added for ${student.user.name}`
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Add Fee by Student ID Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to add fee record"
    });
  }
};

// ============= UPDATE FEE PAYMENT =============
const updateFeePayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { amountPaid, paymentMode, transactionId } = req.body;

    const fee = await Fee.findByPk(id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        error: 'Fee record not found'
      });
    }

    const newAmountPaid = fee.amount_paid + amountPaid;
    
    await fee.update({
      amount_paid: newAmountPaid,
      balance_due: fee.total_amount - newAmountPaid,
      payment_mode: paymentMode || fee.payment_mode,
      transaction_id: transactionId || fee.transaction_id,
      payment_date: newAmountPaid >= fee.total_amount ? new Date() : fee.payment_date,
      updated_by: req.user.id
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
    const isTeacher = requestingUser.role === 'teacher';
    const isAdmin = requestingUser.role === 'admin';

    if (!isStudent && !isParent && !isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Build where clause
    const whereClause = { student_id: studentId };
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    if (year) {
      whereClause.fee_year = year;
    }

    const fees = await Fee.findAll({
      where: whereClause,
      order: [['fee_year', 'DESC'], ['createdAt', 'DESC']]
    });

    // Parse particulars for each fee
    const feesWithDetails = fees.map(fee => ({
      ...fee.toJSON(),
      particulars: typeof fee.particulars === 'string' ? JSON.parse(fee.particulars) : fee.particulars
    }));

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
      summary.total_fees += parseFloat(fee.total_amount);
      summary.total_paid += parseFloat(fee.amount_paid);
      summary.total_due += parseFloat(fee.balance_due);
      
      if (fee.status === 'pending') summary.pending_count++;
      else if (fee.status === 'paid') summary.paid_count++;
      else if (fee.status === 'overdue') summary.overdue_count++;
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
        fees: feesWithDetails,
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

// ============= GET ALL FEE RECORDS (Admin/Teacher) =============
const getAllFeeRecords = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const { class: className, section, status, month, year } = req.query;

    const whereClause = {};
    if (className) whereClause.class = className;
    if (section) whereClause.section = section;
    if (status && status !== 'all') whereClause.status = status;
    if (year) whereClause.fee_year = year;
    if (month) {
      whereClause[Op.or] = [
        { fee_month_from: month },
        { fee_month_to: month }
      ];
    }

    const fees = await Fee.findAll({
      where: whereClause,
      include: [{ model: Student, as: 'student' }],
      order: [['fee_year', 'DESC'], ['createdAt', 'DESC']]
    });

    const feesWithDetails = fees.map(fee => ({
      ...fee.toJSON(),
      particulars: typeof fee.particulars === 'string' ? JSON.parse(fee.particulars) : fee.particulars
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

// ============= DELETE FEE RECORD (Admin only) =============
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
    
    // Get summary by status
    const statusSummary = await Fee.findAll({
      where: { fee_year: currentYear },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_amount'],
        [sequelize.fn('SUM', sequelize.col('amount_paid')), 'total_paid'],
        [sequelize.fn('SUM', sequelize.col('balance_due')), 'total_due']
      ],
      group: ['status']
    });

    // Get monthly collection
    const monthlyCollection = await Fee.findAll({
      where: { 
        fee_year: currentYear,
        status: 'paid'
      },
      attributes: [
        'fee_month_from',
        [sequelize.fn('SUM', sequelize.col('amount_paid')), 'collected']
      ],
      group: ['fee_month_from']
    });

    res.json({
      success: true,
      data: {
        status_summary: statusSummary,
        monthly_collection: monthlyCollection,
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
  addFeeByStudentId,
  updateFeePayment,
  getStudentFee,
  getAllFeeRecords,
  deleteFeeRecord,
  getFeeDashboard
};