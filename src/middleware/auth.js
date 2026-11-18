const jwt = require("jsonwebtoken");
const { User } = require("../models");
exports.protect = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "Please log in to continue." });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "development_secret_change_me");
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ message: "Account not found." });
    next();
  } catch { res.status(401).json({ message: "Session expired. Please log in again." }); }
};
exports.allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: "You do not have permission for this action." });
