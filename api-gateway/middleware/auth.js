const jwt = require("jsonwebtoken");

const SECRET = "mysecret"; // 🔥 move to env later

function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "Token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);

    // Attach user info to request
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user;

    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    next();
  };
}

module.exports = {
  authorize,
  authenticate,
};
