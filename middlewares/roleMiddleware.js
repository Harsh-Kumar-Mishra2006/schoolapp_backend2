const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized access'
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access forbidden. Insufficient permissions.',
        requiredRoles: roles,
        yourRole: req.user.role
      });
    }

    next();
  };
};

// Check if user has specific permissions
const hasPermission = (permissions = []) => {
  return (req, res, next) => {
    // Admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    // Define role-based permissions
    const rolePermissions = {
      teacher: ['view_attendance', 'mark_attendance', 'view_marks', 'enter_marks'],
      student: ['view_own_attendance', 'view_own_marks'],
      parent: ['view_children_attendance', 'view_children_marks']
    };

    const userPermissions = rolePermissions[req.user.role] || [];
    const hasRequiredPermissions = permissions.every(p => userPermissions.includes(p));

    if (!hasRequiredPermissions) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = { authorize, hasPermission };