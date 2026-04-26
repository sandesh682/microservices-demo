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

  const MAX_RETRIES = 3;

  channel.consume(
    q.queue,
    (msg) => {
      if (!msg) return;

      const event = JSON.parse(msg.content.toString());

      if (event.type !== "OrderCreated") return;

      const order = event.data;

      console.log(
        `💳 Processing order ${order.id}, retry: ${event.retryCount}`,
      );

      const isSuccess = Math.random() > 0.7; // make failures more visible

      if (isSuccess) {
        console.log("✅ Payment SUCCESS:", order.id);

        channel.publish(
          "order_events",
          "",
          Buffer.from(
            JSON.stringify({
              eventId: event.eventId,
              type: "PaymentSuccess",
              data: { orderId: order.id },
            }),
          ),
        );
      } else {
        console.log("❌ Payment FAILED:", order.id);

        if (event.retryCount < MAX_RETRIES) {
          console.log(`🔁 Retrying order ${order.id}...`);

          setTimeout(() => {
            channel.publish(
              "order_events",
              "",
              Buffer.from(
                JSON.stringify({
                  ...event,
                  retryCount: event.retryCount + 1, // 🔥 increment
                }),
              ),
            );
          }, 2000); // 2 sec delay
        } else {
          console.log("🚨 Max retries reached. Marking failed:", order.id);

          channel.publish(
            "order_events",
            "",
            Buffer.from(
              JSON.stringify({
                eventId: event.eventId,
                type: "PaymentFailed",
                data: { orderId: order.id },
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
