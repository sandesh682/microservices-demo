const amqp = require("amqplib");

async function startOrderConsumer(orders) {
  console.log("Consumer is initiated");
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  const exchange = "order_events";

  const processedEvents = new Set();

  await channel.assertExchange(exchange, "fanout", { durable: true });

  const q = await channel.assertQueue("", { exclusive: true });

  await channel.bindQueue(q.queue, exchange, "");

  console.log("🟡 Order Service listening for saga events...");

  channel.consume(
    q.queue,
    (msg) => {
      if (msg !== null) {
        const event = JSON.parse(msg.content.toString());

        // 🔥 Idempotency check
        if (processedEvents.has(event.eventId)) {
          console.log("⚠️ Duplicate ignored:", event.eventId);
          return;
        }

        processedEvents.add(event.eventId);

        if (event.type === "PaymentFailed") {
          console.log("⚠️ Compensation triggered for order:", event.orderId);

          const order = orders.find((o) => o.id === event.orderId);

          if (order) {
            order.status = "CANCELLED";
            console.log("❌ Order cancelled:", order.id);
          }
        }

        if (event.type === "PaymentSuccess") {
          const order = orders.find((o) => o.id === event.orderId);

          if (order) {
            order.status = "COMPLETED";
            console.log("✅ Order completed:", order.id);
          }
        }
      }
    },
    { noAck: true },
  );
}

module.exports = { startOrderConsumer };
