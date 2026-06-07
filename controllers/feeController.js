// controllers/feeController.js
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const User = require('../models/User');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

// Helper function to resolve student by identifier
const resolveStudentByIdentifier = async (identifier, transaction = null) => {
  let student = null;
  
  // Try as database ID
  if (!isNaN(identifier) && identifier.toString().trim() !== '') {
    student = await Student.findByPk(parseInt(identifier), {
      include: [{ model: User, as: 'user' }],
      transaction
    });
  }
  
  // Try as school ID (e.g., "STU001")
  if (!student) {
    student = await Student.findOne({
      where: { studentId: identifier.toString() },
      include: [{ model: User, as: 'user' }],
      transaction
    });
  }
  
  // Try by email
  if (!student && identifier.includes('@')) {
    const user = await User.findOne({
      where: { email: identifier.toLowerCase(), role: 'student' },
      transaction
    });
    if (user) {
      student = await Student.findOne({
        where: { userId: user.id },
        include: [{ model: User, as: 'user' }],
        transaction
      });
    }
  }
  
  return student;
};

// ============= ADD FEE FOR STUDENT (Admin only) =============
const addFee = async (req, res) => {
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
      feeComponents,
      feeMonth,
      feeYear,
      dueDate,
      remarks
    } = req.body;

    // Validation
    if (!studentId || !feeComponents || !feeMonth || !feeYear || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, feeComponents, feeMonth, feeYear, dueDate'
      });
    }

    if (!Array.isArray(feeComponents) || feeComponents.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'feeComponents must be a non-empty array'
      });
    }

    // Find student by ID (supports both formats)
    const student = await resolveStudentByIdentifier(studentId, transaction);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: `Student not found with ID: ${studentId}`
      });
    }

    // Check if fee already exists for this student and month/year
    const existingFee = await Fee.findOne({
      where: {
        studentId: student.id,
        feeMonth: feeMonth,
        feeYear: feeYear
      },
      transaction
    });

    if (existingFee) {
      return res.status(400).json({
        success: false,
        error: `Fee record for ${feeMonth} ${feeYear} already exists for this student`
      });
    }

    // Calculate total amount
    const totalAmount = feeComponents.reduce((sum, component) => {
      return sum + (parseFloat(component.amount) || 0);
    }, 0);

    const fee = await Fee.create({
      studentId: student.id,
      feeComponents: feeComponents,
      feeMonth: feeMonth,
      feeYear: feeYear,
      totalAmount: totalAmount,
      dueDate: dueDate,
      status: 'Pending',
      remarks: remarks || null,
      addedBy: req.user.id,
      isPublished: true
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: {
        id: fee.id,
        student: {
          id: student.studentId,
          name: student.user.name,
          class: student.class,
          section: student.section,
          rollNumber: student.rollNumber
        },
        feeComponents: fee.feeComponents,
        totalAmount: fee.totalAmount,
        feeMonth: fee.feeMonth,
        feeYear: fee.feeYear,
        dueDate: fee.dueDate,
        status: fee.status
      },
      message: `Fee record added successfully for ${student.user.name}`
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

// ============= ADD PAYMENT TO FEE RECORD =============
const addPayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { amount, mode, receiptNo, remarks } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid payment amount is required'
      });
    }

    const fee = await Fee.findByPk(id, { transaction });

    if (!fee) {
      return res.status(404).json({
        success: false,
        error: 'Fee record not found'
      });
    }

    if (fee.status === 'Paid') {
      return res.status(400).json({
        success: false,
        error: 'This fee record is already fully paid'
      });
    }

    const payment = await fee.addPayment({
      amount: amount,
      mode: mode || 'Cash',
      receiptNo: receiptNo,
      collectedBy: req.user.id,
      remarks: remarks
    }, transaction);

    await transaction.commit();

    res.json({
      success: true,
      data: {
        payment: payment,
        fee: {
          id: fee.id,
          totalAmount: fee.totalAmount,
          totalPaid: fee.totalPaid,
          balanceAmount: fee.balanceAmount,
          status: fee.status
        }
      },
      message: `Payment of ₹${amount} recorded successfully`
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Add Payment Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to add payment: " + err.message
    });
  }
};

// ============= GET STUDENT FEE (Student/Parent view) =============
const getStudentFee = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status, year } = req.query;

    const requestingUser = req.user;
    
    // Resolve student by ID
    const student = await resolveStudentByIdentifier(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: `Student not found with ID: ${studentId}`
      });
    }

    // Authorization check
    const isStudent = requestingUser.role === 'student' && requestingUser.id === student.userId;
    const isParent = requestingUser.role === 'parent';
    const isAdmin = requestingUser.role === 'admin';

    let isChildOfParent = false;
    if (isParent) {
      const parent = await User.findByPk(requestingUser.id);
      if (parent && parent.email === student.parentEmail) {
        isChildOfParent = true;
      }
    }

    if (!isStudent && !isChildOfParent && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own or your child\'s fee records.'
      });
    }

    const whereClause = { studentId: student.id };
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    if (year) {
      whereClause.feeYear = parseInt(year);
    }

    const fees = await Fee.findAll({
      where: whereClause,
      order: [['feeYear', 'DESC'], ['createdAt', 'DESC']]
    });

    // Summary calculations
    const summary = {
      total_fees: 0,
      total_paid: 0,
      total_due: 0,
      pending_count: 0,
      paid_count: 0,
      partially_paid_count: 0,
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
      else if (fee.status === 'Partially Paid') summary.partially_paid_count++;
      else if (fee.status === 'Overdue') summary.overdue_count++;
    });

    res.json({
      success: true,
      data: {
        student: {
          id: student.studentId,
          name: student.user.name,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section,
          email: student.user.email
        },
        fees: fees.map(fee => ({
          id: fee.id,
          feeComponents: fee.feeComponents,
          feeMonth: fee.feeMonth,
          feeYear: fee.feeYear,
          totalAmount: fee.totalAmount,
          totalPaid: fee.totalPaid,
          balanceAmount: fee.balanceAmount,
          dueDate: fee.dueDate,
          status: fee.status,
          payments: fee.payments,
          remarks: fee.remarks
        })),
        summary
      }
    });

  } catch (err) {
    console.error("Get Student Fee Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch fee records: " + err.message
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

    const { status, year, month, class: className, section } = req.query;

    const whereClause = {};
    if (status && status !== 'all') whereClause.status = status;
    if (year) whereClause.feeYear = parseInt(year);
    if (month) whereClause.feeMonth = month;

    const include = [{
      model: Student,
      as: 'student',
      include: [{ model: User, as: 'user' }],
      where: {}
    }];

    if (className) include[0].where.class = className;
    if (section) include[0].where.section = section;

    const fees = await Fee.findAll({
      where: whereClause,
      include: include,
      order: [['feeYear', 'DESC'], ['createdAt', 'DESC']]
    });

    const feesWithDetails = fees.map(fee => ({
      id: fee.id,
      studentId: fee.student?.studentId || 'N/A',
      studentName: fee.student?.user?.name || 'N/A',
      studentEmail: fee.student?.user?.email || 'N/A',
      class: fee.student?.class || 'N/A',
      section: fee.student?.section || 'N/A',
      rollNumber: fee.student?.rollNumber || 'N/A',
      feeComponents: fee.feeComponents,
      feeMonth: fee.feeMonth,
      feeYear: fee.feeYear,
      totalAmount: fee.totalAmount,
      totalPaid: fee.totalPaid || 0,
      balanceAmount: fee.balanceAmount || (fee.totalAmount - (fee.totalPaid || 0)),
      status: fee.status,
      dueDate: fee.dueDate,
      lastPaymentDate: fee.lastPaymentDate,
      lastPaymentAmount: fee.lastPaymentAmount,
      paymentsCount: fee.payments?.length || 0,
      remarks: fee.remarks
    }));

    res.json({
      success: true,
      data: feesWithDetails,
      count: fees.length,
      summary: {
        total_amount: feesWithDetails.reduce((sum, f) => sum + parseFloat(f.totalAmount), 0),
        total_paid: feesWithDetails.reduce((sum, f) => sum + parseFloat(f.totalPaid), 0),
        total_due: feesWithDetails.reduce((sum, f) => sum + parseFloat(f.balanceAmount), 0)
      }
    });

  } catch (err) {
    console.error("Get All Fee Records Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch fee records: " + err.message
    });
  }
};

// ============= UPDATE FEE RECORD (Admin only) =============
const updateFeeRecord = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can update fee records'
      });
    }

    const { id } = req.params;
    const { feeComponents, dueDate, remarks, status } = req.body;

    const fee = await Fee.findByPk(id, { transaction });

    if (!fee) {
      return res.status(404).json({
        success: false,
        error: 'Fee record not found'
      });
    }

    const updateData = {};
    if (feeComponents) updateData.feeComponents = feeComponents;
    if (dueDate) updateData.dueDate = dueDate;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (status) updateData.status = status;

    await fee.update(updateData, { transaction });
    await transaction.commit();

    res.json({
      success: true,
      data: fee,
      message: 'Fee record updated successfully'
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Update Fee Record Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update fee record: " + err.message
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
    const fee = await Fee.findByPk(id, { transaction });
    
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
      error: "Failed to delete fee record: " + err.message
    });
  }
};

// ============= GET FEE DASHBOARD STATISTICS =============
const getFeeDashboard = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    
    // Summary by status for current year
    const statusSummary = await Fee.findAll({
      where: { feeYear: currentYear },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'total_amount'],
        [sequelize.fn('SUM', sequelize.col('totalPaid')), 'total_paid']
      ],
      group: ['status']
    });

    // Monthly collection summary
    const monthlySummary = await Fee.findAll({
      where: { feeYear: currentYear },
      attributes: [
        'feeMonth',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'total_amount'],
        [sequelize.fn('SUM', sequelize.col('totalPaid')), 'total_paid']
      ],
      group: ['feeMonth'],
      order: [[sequelize.literal(`FIELD(feeMonth, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')`)]]
    });

    // Overdue fees
    const today = new Date().toISOString().split('T')[0];
    const overdueCount = await Fee.count({
      where: {
        feeYear: currentYear,
        status: { [Op.ne]: 'Paid' },
        dueDate: { [Op.lt]: today }
      }
    });

    res.json({
      success: true,
      data: {
        current_year: currentYear,
        current_month: currentMonth,
        status_summary: statusSummary,
        monthly_summary: monthlySummary,
        overdue_count: overdueCount,
        total_collection: {
          total_fees: statusSummary.reduce((sum, s) => sum + parseFloat(s.dataValues.total_amount || 0), 0),
          total_collected: statusSummary.reduce((sum, s) => sum + parseFloat(s.dataValues.total_paid || 0), 0)
        }
      }
    });

  } catch (err) {
    console.error("Get Fee Dashboard Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch dashboard data: " + err.message
    });
  }
};

module.exports = {
  addFee,
  addPayment,
  getStudentFee,
  getAllFeeRecords,
  updateFeeRecord,
  deleteFeeRecord,
  getFeeDashboard,
  resolveStudentByIdentifier
};