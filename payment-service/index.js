const amqp = require("amqplib");

async function start() {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  const exchange = "order_events";

  const processedEvents = new Set();

  // Create exchange (safe if already exists)
  await channel.assertExchange(exchange, "fanout", {
    durable: false,
  });

  // Create a queue (auto-generated name)
  const q = await channel.assertQueue("", {
    exclusive: true,
  });

  console.log("Waiting for order events...");

  // Bind queue to exchange
  await channel.bindQueue(q.queue, exchange, "");

  // Consume messages
  channel.consume(
    q.queue,
    (msg) => {
      if (msg !== null) {
        const event = JSON.parse(msg.content.toString());

        // 🔥 ONLY process OrderCreated
        if (event.type !== "OrderCreated") {
          return;
        }

        // 🔥 Idempotency check
        if (processedEvents.has(event.eventId)) {
          console.log("⚠️ Duplicate ignored:", event.eventId);
          return;
        }

        processedEvents.add(event.eventId);

        const order = event.data;

        console.log("💳 Payment received order:", order.id);

        const isSuccess = Math.random() > 0.5;

        if (isSuccess) {
          console.log("✅ Payment SUCCESS for order:", order.id);

          channel.publish(
            exchange,
            "",
            Buffer.from(
              JSON.stringify({
                type: "PaymentSuccess",
                orderId: order.id,
              }),
            ),
          );
        } else {
          console.log("❌ Payment FAILED for order:", order.id);

          channel.publish(
            exchange,
            "",
            Buffer.from(
              JSON.stringify({
                type: "PaymentFailed",
                orderId: order.id,
              }),
            ),
          );
        }
      }
    },
    { noAck: true },
  );
}

start();
