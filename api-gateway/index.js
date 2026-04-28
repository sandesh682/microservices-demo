const express = require("express");
const axios = require("axios");
const client = require("./grpc");
const { authenticate, authorize } = require("./middleware/auth");

const app = express();
app.use(express.json());

// 🔧 Service URLs
const ORDER_SERVICE_URL = "http://localhost:3000";
const USER_SERVICE_URL = "http://localhost:3001";

const axiosInstance = axios.create({
  timeout: 2000, // ⏱️ 2 sec timeout
});

// 🔹 Logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

async function callWithRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      console.log(`Retry ${i + 1}...`);

      if (i === retries - 1) throw err;

      await new Promise((res) => setTimeout(res, 500)); // delay
    }
  }
}

// 🔹 Route: Order Service
app.post("/order", authenticate, authorize("user"), async (req, res) => {
  const response = await axios.post(`${ORDER_SERVICE_URL}/order`, {
    ...req.body,
    userId: req.user.id,
  });

  res.json(response.data);
});

// 🔹 Only admin can cancel order
app.post(
  "/order/cancel",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    res.json({ message: "Order cancelled (admin only)" });
  },
);

// 🔹 Route: User Service (example)
app.get("/user/:id", (req, res) => {
  const deadline = new Date(Date.now() + 2000); // 2 sec

  client.GetUser({ id: req.params.id }, { deadline }, (err, response) => {
    if (err) {
      console.error("❌ gRPC User service error:", err.message);
      return res.status(500).json({ message: "User service failed" });
    }

    res.json(response);
  });
});

// 🚀 Start server
app.listen(4000, () => {
  console.log("🚀 API Gateway running on port 4000");
});
