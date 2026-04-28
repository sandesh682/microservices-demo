const jwt = require("jsonwebtoken");

const token = jwt.sign({ id: 1, name: "Sandesh", role: "user" }, "mysecret", {
  expiresIn: "1h",
});

console.log(token);
