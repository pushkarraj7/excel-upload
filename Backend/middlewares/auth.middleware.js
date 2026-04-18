const jwt = require('jsonwebtoken');
require('dotenv').config();

// ----------------------------
// 1) NORMAL USER AUTH
// ----------------------------
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user; // set user object
        next();
    });
};

// ----------------------------
// 2) ADMIN AUTH ONLY
// ----------------------------
const authenticateAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: true,
            message: "Not authenticated",
        });
    }
    
    const allowedRoles = ["admin", "superadmin"];

    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            error: true,
            message: "Access denied. Admins and SuperAdmins only.",
        });
    }

    next();
};

module.exports = {
    authenticateToken,
    authenticateAdmin
};
