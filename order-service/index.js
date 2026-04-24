const express = require("express");
const { connectQueue, publishOrderCreated } = require("./publisher");
const { getUser } = require("./grpcClient");

const app = express();
app.use(express.json());

// In-memory DB (for now)
const orders = [];

// Create Order API
app.post("/order", async (req, res) => {
  const { userId, product } = req.body;

  const user = await getUser(userId);

  const newOrder = {
    id: orders.length + 1,
    userId,
    userName: user.name,
    product,
    status: "CREATED",
  };

  orders.push(newOrder);

  console.log("Order Created:", newOrder);

  publishOrderCreated(newOrder);

  res.json({
    message: "Order created successfully",
    order: newOrder,
  });
});

// Get all orders
app.get("/orders", (req, res) => {
  res.json(orders);
});

app.listen(3000, async () => {
  await connectQueue();
  console.log("Order Service running on port 3000");
});
