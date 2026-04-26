const Fee = require('../models/Fee');
const FeePayment = require('../models/FeePayment');
const Student = require('../models/Student');
const User = require('../models/User');
const Parent = require('../models/Parent');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

// Helper function to convert number to words
function numberToWords(num) {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function convert(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }
  
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  let result = convert(rupees) + ' Rupees';
  if (paise > 0) {
    result += ' and ' + convert(paise) + ' Paise';
  }
  return result + ' Only';
}

// ============= ADD FEE RECORD (Admin only) =============
const addFeeRecord = async (req, res) => {
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
      currentMonth,
      currentYear,
      pendingFrom,
      pendingFromYear,
      monthlyFee,
      transportFee,
      examFee,
      tuitionFee,
      lateFee,
      remarks,
      dueDate
    } = req.body;

    // Validation
    if (!studentId || !currentMonth || !currentYear || !pendingFrom || !pendingFromYear) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, currentMonth, currentYear, pendingFrom, pendingFromYear'
      });
    }

    // Check if student exists
    const student = await Student.findByPk(studentId, {
      include: [{ model: User, as: 'user' }]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Check if fee record already exists for this student and current month/year
    const existingFee = await Fee.findOne({
      where: {
        studentId,
        currentMonth,
        currentYear
      }
    });

    if (existingFee) {
      return res.status(400).json({
        success: false,
        error: `Fee record for ${currentMonth} ${currentYear} already exists. Use update endpoint instead.`
      });
    }

    // Calculate total amount
    const totalAmount = (parseFloat(monthlyFee || 0) + 
                        parseFloat(transportFee || 0) + 
                        parseFloat(examFee || 0) + 
                        parseFloat(tuitionFee || 0) +
                        parseFloat(lateFee || 0));

    // Convert to words
    const amountInWords = numberToWords(totalAmount);

    // Create fee record
    const fee = await Fee.create({
      studentId,
      currentMonth,
      currentYear,
      pendingFrom,
      pendingFromYear,
      monthlyFee: monthlyFee || 0,
      transportFee: transportFee || 0,
      examFee: examFee || 0,
      tuitionFee: tuitionFee || 0,
      lateFee: lateFee || 0,
      totalAmount,
      amountInWords,
      remarks: remarks || null,
      dueDate: dueDate || new Date(),
      addedBy: req.user.id,
      isPublished: true
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: fee,
      message: `Fee record for ${student.user.name} added successfully`
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Add Fee Record Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to add fee record: " + err.message
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
    const {
      monthlyFee,
      transportFee,
      examFee,
      tuitionFee,
      lateFee,
      remarks,
      dueDate,
      isPublished
    } = req.body;

    const fee = await Fee.findByPk(id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        error: 'Fee record not found'
      });
    }

    const updateData = {};
    if (monthlyFee !== undefined) updateData.monthlyFee = monthlyFee;
    if (transportFee !== undefined) updateData.transportFee = transportFee;
    if (examFee !== undefined) updateData.examFee = examFee;
    if (tuitionFee !== undefined) updateData.tuitionFee = tuitionFee;
    if (lateFee !== undefined) updateData.lateFee = lateFee;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    // Recalculate total amount
    const newTotal = (parseFloat(updateData.monthlyFee || fee.monthlyFee) +
                     parseFloat(updateData.transportFee || fee.transportFee) +
                     parseFloat(updateData.examFee || fee.examFee) +
                     parseFloat(updateData.tuitionFee || fee.tuitionFee) +
                     parseFloat(updateData.lateFee || fee.lateFee));
    
    updateData.totalAmount = newTotal;
    updateData.amountInWords = numberToWords(newTotal);
    updateData.balanceAmount = newTotal - fee.totalPaid;

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
      error: "Failed to update fee record"
    });
  }
};

// ============= RECORD FEE PAYMENT (Admin only) =============
const recordPayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can record payments'
      });
    }

    const { feeId, amountPaid, paymentMode, transactionId, remarks } = req.body;

    if (!feeId || !amountPaid || !paymentMode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: feeId, amountPaid, paymentMode'
      });
    }

    const fee = await Fee.findByPk(feeId);

    if (!fee) {
      return res.status(404).json({
        success: false,
        error: 'Fee record not found'
      });
    }

    // Create payment record
    const payment = await FeePayment.create({
      feeId,
      studentId: fee.studentId,
      paymentDate: new Date(),
      amountPaid,
      paymentMode,
      transactionId: transactionId || null,
      receiptNumber: `RCP-${Date.now()}-${fee.studentId}`,
      remarks: remarks || null,
      recordedBy: req.user.id
    }, { transaction });

    // Update fee record
    const newTotalPaid = parseFloat(fee.totalPaid) + parseFloat(amountPaid);
    const balanceAmount = fee.totalAmount - newTotalPaid;
    
    let status = fee.status;
    if (balanceAmount <= 0) {
      status = 'Paid';
    } else if (newTotalPaid > 0) {
      status = 'Partially Paid';
    }

    await fee.update({
      totalPaid: newTotalPaid,
      balanceAmount: balanceAmount,
      status: status,
      lastPaymentDate: new Date(),
      lastPaymentAmount: amountPaid
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      data: { payment, fee },
      message: `Payment of ₹${amountPaid} recorded successfully. Balance: ₹${balanceAmount}`
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Record Payment Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to record payment"
    });
  }
};

// ============= GET STUDENT FEE DETAILS (Student/Parent/Admin) =============
const getStudentFeeDetails = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { currentMonth, currentYear } = req.query;

    // Authorization check
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

    // Check permissions
    const isStudent = requestingUser.role === 'student' && requestingUser.id === student.userId;
    const isParent = requestingUser.role === 'parent';
    const isAdmin = requestingUser.role === 'admin';

    if (!isStudent && !isParent && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // If parent, verify this student is their child
    if (isParent) {
      const parent = await Parent.findOne({ where: { userId: requestingUser.id } });
      if (!parent || !parent.children || !parent.children.includes(studentId)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. This student is not your child.'
        });
      }
    }

    // Build query
    const whereClause = { studentId, isPublished: true };
    if (currentMonth) whereClause.currentMonth = currentMonth;
    if (currentYear) whereClause.currentYear = currentYear;

    const fees = await Fee.findAll({
      where: whereClause,
      include: [
        {
          model: Student,
          as: 'student',
          include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
        }
      ],
      order: [['currentYear', 'DESC'], 
              [sequelize.literal(`FIELD(currentMonth, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')`)]]
    });

    // Get payment history for each fee
    const feesWithPayments = [];
    for (const fee of fees) {
      const payments = await FeePayment.findAll({
        where: { feeId: fee.id },
        order: [['paymentDate', 'DESC']]
      });
      
      feesWithPayments.push({
        ...fee.toJSON(),
        payments
      });
    }

    // Calculate summary
    let totalPending = 0;
    let totalPaid = 0;
    let totalAmount = 0;
    let pendingMonths = 0;

    fees.forEach(fee => {
      totalAmount += parseFloat(fee.totalAmount);
      totalPaid += parseFloat(fee.totalPaid);
      totalPending += parseFloat(fee.balanceAmount);
      if (fee.status !== 'Paid') pendingMonths += fee.monthsPending;
    });

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: student.user.name,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section,
          email: student.user.email
        },
        fees: feesWithPayments,
        summary: {
          totalAmountDue: totalAmount,
          totalPaid: totalPaid,
          totalPending: totalPending,
          pendingMonths: pendingMonths,
          isSuspended: fees.some(f => f.isSuspended)
        }
      }
    });

  } catch (err) {
    console.error("Get Student Fee Details Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch fee details"
    });
  }
};

// ============= GET ALL PENDING FEES (Admin only) =============
const getAllPendingFees = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }

    const { class: className, section, status } = req.query;

    const whereClause = { isPublished: true };
    if (status) whereClause.status = status;
    if (status === 'Overdue') {
      whereClause.dueDate = { [Op.lt]: new Date() };
      whereClause.status = { [Op.ne]: 'Paid' };
    }

    const fees = await Fee.findAll({
      where: whereClause,
      include: [
        {
          model: Student,
          as: 'student',
          where: className ? { class: className, ...(section && { section }) } : {},
          include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
        }
      ],
      order: [
        ['isSuspended', 'DESC'],
        ['monthsPending', 'DESC'],
        ['dueDate', 'ASC']
      ]
    });

    // Filter out null students (in case of mismatch)
    const validFees = fees.filter(fee => fee.student);

    // Calculate statistics
    const stats = {
      totalPending: validFees.length,
      totalAmount: validFees.reduce((sum, fee) => sum + parseFloat(fee.balanceAmount), 0),
      suspended: validFees.filter(f => f.isSuspended).length,
      overdue: validFees.filter(f => f.dueDate < new Date() && f.status !== 'Paid').length,
      monthsTotal: validFees.reduce((sum, fee) => sum + fee.monthsPending, 0)
    };

    res.json({
      success: true,
      data: {
        fees: validFees,
        statistics: stats
      }
    });

  } catch (err) {
    console.error("Get All Pending Fees Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch pending fees"
    });
  }
};

// ============= GET STUDENTS AT RISK (Pending > 3 months) =============
const getStudentsAtRisk = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }

    const fees = await Fee.findAll({
      where: {
        monthsPending: { [Op.gt]: 3 },
        status: { [Op.ne]: 'Paid' },
        isPublished: true
      },
      include: [
        {
          model: Student,
          as: 'student',
          include: [{ model: User, as: 'user', attributes: ['name', 'email', 'phone'] }]
        }
      ],
      order: [['monthsPending', 'DESC']]
    });

    const atRisk = fees.filter(f => f.monthsPending > 3 && f.monthsPending <= 6);
    const critical = fees.filter(f => f.monthsPending > 6);

    res.json({
      success: true,
      data: {
        atRisk: atRisk,
        critical: critical,
        summary: {
          totalAtRisk: atRisk.length,
          totalCritical: critical.length,
          totalAmountAtRisk: atRisk.reduce((sum, f) => sum + parseFloat(f.balanceAmount), 0),
          totalAmountCritical: critical.reduce((sum, f) => sum + parseFloat(f.balanceAmount), 0)
        }
      }
    });

  } catch (err) {
    console.error("Get Students At Risk Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch at-risk students"
    });
  }
};

// ============= SUSPEND STUDENT (Admin only) =============
const suspendStudent = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }

    const { studentId, reason } = req.body;

    const fees = await Fee.findAll({
      where: {
        studentId,
        isPublished: true,
        status: { [Op.ne]: 'Paid' }
      },
      transaction
    });

    if (fees.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No pending fees found for this student'
      });
    }

    for (const fee of fees) {
      await fee.update({
        isSuspended: true,
        status: 'Suspended',
        suspensionDate: new Date(),
        suspensionReason: reason || `Fee pending for ${fee.monthsPending} months`
      }, { transaction });
    }

    // Update user account status
    const student = await Student.findByPk(studentId, { transaction });
    const user = await User.findByPk(student.userId, { transaction });
    await user.update({ isActive: false }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: `Student suspended successfully. ${fees.length} fee records updated.`
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Suspend Student Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to suspend student"
    });
  }
};

// ============= GET FEE PAYMENT HISTORY =============
const getPaymentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;

    const payments = await FeePayment.findAll({
      where: { studentId },
      include: [
        {
          model: Fee,
          as: 'fee',
          attributes: ['currentMonth', 'currentYear', 'totalAmount']
        },
        {
          model: User,
          as: 'recordedByUser',
          attributes: ['name']
        }
      ],
      order: [['paymentDate', 'DESC']]
    });

    res.json({
      success: true,
      data: payments
    });

  } catch (err) {
    console.error("Get Payment History Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payment history"
    });
  }
};

module.exports = {
  addFeeRecord,
  updateFeeRecord,
  recordPayment,
  getStudentFeeDetails,
  getAllPendingFees,
  getStudentsAtRisk,
  suspendStudent,
  getPaymentHistory
};